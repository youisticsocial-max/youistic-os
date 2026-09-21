"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";

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
  const numericAmount = Number(data.amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("INVALID_AMOUNT: Expense amount must be a positive finite number.");
  }
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
}) {
  const session = await requireRole(["ADMIN", "BDE"]);
  const numericAmount = Number(data.amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("INVALID_AMOUNT: Revenue amount must be a positive finite number.");
  }

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
