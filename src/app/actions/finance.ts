"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { isPositiveFiniteAmount } from "@/lib/validation";

export async function getFinanceSummary() {
  await requireRole(["ADMIN"]);
  try {
    // Fetch revenue and expenses in PARALLEL
    const [revenueEntries, expenseEntries] = await Promise.all([
      prisma.revenueEntry.findMany({
        include: { client: true },
        orderBy: { paymentDate: "desc" },
      }),
      prisma.expenseEntry.findMany({
        orderBy: { expenseDate: "desc" },
      }),
    ]);

    return {
      revenueEntries,
      expenseEntries,
    };
  } catch (error) {
    console.error("Failed to fetch finance data:", error);
    return {
      revenueEntries: [],
      expenseEntries: [],
    };
  }
}

export async function createExpense(data: {
  category: "AD_SPEND" | "SERVER_EMI" | "SALARY" | "TOOLS" | "OFFICE" | "MISC";
  amount: number;
  expenseDate: Date | string;
  description: string;
  vendor?: string;
}) {
  await requireRole(["ADMIN"]);
  if (!isPositiveFiniteAmount(data.amount)) {
    throw new Error("INVALID_AMOUNT: Expense amount must be a positive finite number.");
  }
  const numericAmount = Number(data.amount);
  try {
    const expense = await prisma.expenseEntry.create({
      data: {
        category: data.category,
        amount: numericAmount,
        expenseDate: new Date(data.expenseDate),
        description: data.description,
        vendor: data.vendor || null,
      },
    });
    try {
      revalidatePath("/dashboard/finance");
      revalidatePath("/ceo/dashboard");
    } catch {}
    return expense;
  } catch (error) {
    console.error("Failed to create expense:", error);
    throw error;
  }
}

export async function createRevenue(data: {
  clientId: string;
  amount: number;
  paymentDate: Date | string;
  revenueType: "FBP" | "TECH" | "HYBRID";
  paymentStatus?: "PAID" | "PENDING" | "OVERDUE";
  description?: string;
  invoiceNumber?: string;
  clientServiceId?: string;
  invoiceId?: string;
}) {
  const session = await requireRole(["ADMIN", "BDE"]);
  if (!isPositiveFiniteAmount(data.amount)) {
    throw new Error("INVALID_AMOUNT: Revenue amount must be a positive finite number.");
  }
  const numericAmount = Number(data.amount);

  // IDOR & Scope Check: BDE can only create revenue entries for clients assigned to them
  if (session.role === "BDE") {
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { assignedBdeId: true },
    });
    if (!client || client.assignedBdeId !== session.userId) {
      throw new Error("FORBIDDEN: You can only record revenue for clients assigned to you.");
    }
  }

  // Cross-client attribution checks
  if (data.clientServiceId) {
    const service = await prisma.clientService.findUnique({
      where: { id: data.clientServiceId },
      select: { clientId: true },
    });
    if (!service || service.clientId !== data.clientId) {
      throw new Error("CROSS_CLIENT_ATTRIBUTION_MISMATCH: The selected service does not belong to the specified client.");
    }
  }

  if (data.invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      select: { clientId: true },
    });
    if (!invoice || invoice.clientId !== data.clientId) {
      throw new Error("CROSS_CLIENT_ATTRIBUTION_MISMATCH: The selected invoice does not belong to the specified client.");
    }
  }

  try {
    const revenue = await prisma.revenueEntry.create({
      data: {
        clientId: data.clientId,
        amount: numericAmount,
        paymentDate: new Date(data.paymentDate),
        revenueType: data.revenueType,
        paymentStatus: data.paymentStatus || "PAID",
        description: data.description || null,
        invoiceNumber: data.invoiceNumber || null,
        clientServiceId: data.clientServiceId || null,
        invoiceId: data.invoiceId || null,
      },
    });
    try {
      revalidatePath("/dashboard/finance");
      revalidatePath("/ceo/dashboard");
    } catch {}
    return revenue;
  } catch (error) {
    console.error("Failed to create revenue:", error);
    throw error;
  }
}

export async function updateRevenueStatus(id: string, paymentStatus: "PAID" | "PENDING" | "OVERDUE") {
  await requireRole(["ADMIN"]);
  try {
    const updated = await prisma.revenueEntry.update({
      where: { id },
      data: { paymentStatus },
    });
    try {
      revalidatePath("/dashboard/finance");
      revalidatePath("/ceo/dashboard");
    } catch {}
    return updated;
  } catch (error) {
    console.error("Failed to update revenue status:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────
// VALUATION & SERVICE ATTRIBUTION HELPERS
// Enforces Locked Rules 1-4, 9, 10
// ─────────────────────────────────────────────

export async function getActiveServiceValue(clientId: string) {
  await requireRole(["ADMIN", "BDE", "SUPPORT"]);
  const activeServices = await prisma.clientService.findMany({
    where: { clientId, status: "ACTIVE" },
    select: { commercialValue: true },
  });

  let activeServiceValue = 0;
  let knownServicesCount = 0;
  let unknownServicesCount = 0;

  for (const s of activeServices) {
    if (s.commercialValue !== null && s.commercialValue !== undefined) {
      activeServiceValue += Number(s.commercialValue);
      knownServicesCount++;
    } else {
      unknownServicesCount++;
    }
  }

  return {
    activeServiceValue,
    knownServicesCount,
    unknownServicesCount,
  };
}

export async function getLifetimeClientBusinessValue(clientId: string) {
  await requireRole(["ADMIN", "BDE", "SUPPORT"]);
  const allServices = await prisma.clientService.findMany({
    where: { clientId },
    select: { commercialValue: true },
  });

  let lifetimeValue = 0;
  let knownCount = 0;
  let unknownCount = 0;

  for (const s of allServices) {
    if (s.commercialValue !== null && s.commercialValue !== undefined) {
      lifetimeValue += Number(s.commercialValue);
      knownCount++;
    } else {
      unknownCount++;
    }
  }

  return {
    lifetimeValue,
    knownCount,
    unknownCount,
    totalServicesCount: allServices.length,
  };
}

export async function createInvoice(data: {
  clientId: string;
  invoiceNumber: string;
  amount: number;
  clientServiceId?: string;
  dueDate?: Date | string;
  notes?: string;
  status?: "DRAFT" | "ISSUED" | "PAID" | "PARTIAL" | "CANCELLED" | "OVERDUE";
}) {
  await requireRole(["ADMIN"]);
  if (!isPositiveFiniteAmount(data.amount)) {
    throw new Error("INVALID_AMOUNT: Invoice amount must be a positive finite number.");
  }

  const numericAmount = Number(data.amount);
  const cleanInvoiceNumber = data.invoiceNumber.trim();
  if (!cleanInvoiceNumber) {
    throw new Error("INVALID_INVOICE_NUMBER: Invoice number cannot be empty.");
  }

  if (data.clientServiceId) {
    const service = await prisma.clientService.findUnique({
      where: { id: data.clientServiceId },
      select: { clientId: true },
    });
    if (!service || service.clientId !== data.clientId) {
      throw new Error("CROSS_CLIENT_SERVICE_MISMATCH: The selected service does not belong to the specified client.");
    }
  }

  try {
    const invoice = await prisma.invoice.create({
      data: {
        clientId: data.clientId,
        invoiceNumber: cleanInvoiceNumber,
        amount: numericAmount,
        status: data.status || "ISSUED",
        clientServiceId: data.clientServiceId || null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        notes: data.notes || null,
      },
    });
    try {
      revalidatePath("/dashboard/finance");
      revalidatePath("/ceo/dashboard");
    } catch {}
    return invoice;
  } catch (error) {
    console.error("Failed to create invoice:", error);
    throw error;
  }
}

export async function getInvoicesForClient(clientId: string) {
  const session = await requireRole(["ADMIN", "BDE"]);
  if (session.role === "BDE") {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { assignedBdeId: true },
    });
    if (!client || client.assignedBdeId !== session.userId) {
      throw new Error("FORBIDDEN: You can only view invoices for clients assigned to you.");
    }
  }

  return await prisma.invoice.findMany({
    where: { clientId },
    include: {
      clientService: {
        include: { offering: true },
      },
      revenueEntries: true,
    },
    orderBy: { issueDate: "desc" },
  });
}

