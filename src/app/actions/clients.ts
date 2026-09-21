"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";

export async function getClients() {
  const session = await requireRole(["ADMIN", "BDE", "SDR"]);
  try {
    if (session.role === "ADMIN") {
      const clients = await prisma.client.findMany({
        orderBy: { createdAt: "desc" },
        include: { assignedBde: { select: { id: true, name: true, email: true } } },
      });
      return clients;
    } else if (session.role === "BDE") {
      const clients = await prisma.client.findMany({
        where: { assignedBdeId: session.userId },
        orderBy: { createdAt: "desc" },
        include: { assignedBde: { select: { id: true, name: true, email: true } } },
      });
      return clients;
    } else {
      const clients = await prisma.client.findMany({
        orderBy: { createdAt: "desc" },
        include: { assignedBde: { select: { id: true, name: true, email: true } } },
      });
      return clients;
    }
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return [];
  }
}

export async function getClientById(clientId: string) {
  const session = await requireRole(["ADMIN", "BDE", "SDR"]);
  try {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        assignedBde: { select: { id: true, name: true, email: true } },
        originLead: {
          include: {
            assignedSdr: { select: { id: true, name: true, email: true } },
            assignedBde: { select: { id: true, name: true, email: true } },
          }
        },
        projects: { orderBy: { createdAt: "desc" } },
        revenueEntries: { orderBy: { paymentDate: "desc" } },
        supportTickets: { orderBy: { createdAt: "desc" } },
      }
    });

    if (!client) return null;

    if (session.role === "BDE" && client.assignedBdeId !== session.userId) {
      throw new Error("FORBIDDEN: You are not authorized to view another BDE's client.");
    }

    return client;
  } catch (error) {
    console.error("Failed to fetch client by ID:", error);
    throw error;
  }
}

export async function deleteClient(id: string) {
  await requireRole(["ADMIN"]);
  try {
    await prisma.revenueEntry.deleteMany({ where: { clientId: id } });
    await prisma.task.deleteMany({ where: { project: { clientId: id } } });
    await prisma.project.deleteMany({ where: { clientId: id } });
    await prisma.ticketComment.deleteMany({ where: { ticket: { clientId: id } } });
    await prisma.supportTicket.deleteMany({ where: { clientId: id } });
    await prisma.client.delete({ where: { id } });
    try {
      revalidatePath("/dashboard/crm");
    } catch {}
    return { success: true };
  } catch (error) {
    console.error("Failed to delete client:", error);
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "revenue_entries" WHERE "clientId" = $1`, id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM "projects" WHERE "clientId" = $1`, id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM "support_tickets" WHERE "clientId" = $1`, id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM "clients" WHERE "id" = $1`, id);
      try {
        revalidatePath("/dashboard/crm");
      } catch {}
      return { success: true };
    } catch (rawErr) {
      throw new Error(`Failed to delete client: ${rawErr instanceof Error ? rawErr.message : String(rawErr)}`);
    }
  }
}

export async function createClient(data: {
  companyName: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  serviceType: "FBP" | "TECH" | "HYBRID";
  billingModel?: "ONE_TIME" | "RECURRING";
  contractValue: number;
  renewalAmount?: number;
  status: "ACTIVE" | "CHURNED" | "RENEWAL_DUE" | "ONBOARDING";
  industry?: string;
  notes?: string;
  salesCloseDate?: Date | string | null;
  renewalDate?: Date | string | null;
  assignedBdeId?: string | null;
}) {
  const session = await requireRole(["ADMIN", "BDE"]);
  const companyName = data.companyName || "";
  const contactPerson = data.contactPerson || "";
  const email = data.email || null;
  const phone = data.phone || null;
  const serviceType = data.serviceType || "TECH";
  const billingModel = data.billingModel || "ONE_TIME";
  const contractValue = data.contractValue || 0;
  const renewalAmount = data.renewalAmount || 0;
  const status = data.status || "ACTIVE";
  const industry = data.industry || null;
  const notes = data.notes || null;
  const assignedBdeId = data.assignedBdeId || (session.role === "BDE" ? session.userId : null);

  const salesCloseDate = data.salesCloseDate ? new Date(data.salesCloseDate) : new Date();
  
  let renewalDate: Date;
  if (data.renewalDate) {
    renewalDate = new Date(data.renewalDate);
  } else {
    renewalDate = new Date(salesCloseDate);
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  }

  try {
    const client = await prisma.client.create({
      data: {
        companyName,
        contactPerson,
        email,
        phone,
        serviceType,
        billingModel,
        contractValue,
        renewalAmount,
        status,
        industry,
        notes,
        salesCloseDate,
        renewalDate,
        assignedBdeId,
      } as any,
    });
    try {
      revalidatePath("/dashboard/crm");
    } catch {}
    return client;
  } catch (error) {
    console.warn("Prisma ORM create failed, attempting direct raw SQL insert fallback:", error);
    try {
      const id = "cl_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      await prisma.$executeRawUnsafe(
        `INSERT INTO "clients" ("id", "companyName", "contactPerson", "email", "phone", "serviceType", "billingModel", "contractValue", "renewalAmount", "status", "industry", "notes", "salesCloseDate", "renewalDate", "assignedBdeId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6::"ServiceType", $7, $8, $9, $10::"ClientStatus", $11, $12, $13, $14, $15, NOW(), NOW())`,
        id, companyName, contactPerson, email, phone, serviceType, billingModel, contractValue, renewalAmount, status, industry, notes, salesCloseDate, renewalDate, assignedBdeId
      );
      try {
        revalidatePath("/dashboard/crm");
      } catch {}
      return { id, companyName, contactPerson, email, phone, serviceType, billingModel, contractValue, renewalAmount, status, industry, notes, assignedBdeId };
    } catch (rawErr) {
      console.error("Failed to create client with raw SQL fallback:", rawErr);
      throw new Error(`Failed to create client: ${rawErr instanceof Error ? rawErr.message : String(rawErr)}`);
    }
  }
}

const VALID_STATUSES = ["ONBOARDING", "ACTIVE", "RENEWAL_DUE", "CHURNED"];

export async function updateClient(
  id: string,
  data: {
    contactPerson?: string;
    phone?: string;
    email?: string;
    status?: "ACTIVE" | "CHURNED" | "RENEWAL_DUE" | "ONBOARDING";
    notes?: string;
    industry?: string;
    website?: string;
    assignedBdeId?: string | null;
    renewalDate?: Date | string | null;
    renewalAmount?: number;
  }
) {
  const session = await requireRole(["ADMIN", "BDE"]);
  try {
    if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
      throw new Error("INVALID_INPUT: Invalid client status.");
    }

    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) throw new Error("Client not found");

    if (session.role === "BDE" && existing.assignedBdeId !== session.userId) {
      throw new Error("FORBIDDEN: You cannot edit another BDE's client.");
    }

    if (data.assignedBdeId !== undefined && session.role !== "ADMIN") {
      throw new Error("FORBIDDEN: Only ADMIN can reassign client BDE.");
    }

    let targetBdeId: string | null | undefined = undefined;
    if (data.assignedBdeId !== undefined && session.role === "ADMIN") {
      if (data.assignedBdeId) {
        const targetBde = await prisma.user.findFirst({
          where: { id: data.assignedBdeId, role: "BDE", isActive: true }
        });
        if (!targetBde) {
          throw new Error("INVALID_INPUT: Target user must be an active BDE.");
        }
        targetBdeId = data.assignedBdeId;
      } else {
        targetBdeId = null;
      }
    }

    const updated = await prisma.client.update({
      where: { id },
      data: {
        ...(data.contactPerson !== undefined && { contactPerson: data.contactPerson }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(data.industry !== undefined && { industry: data.industry || null }),
        ...(data.website !== undefined && { website: data.website || null }),
        ...(targetBdeId !== undefined && { assignedBdeId: targetBdeId }),
        ...(data.renewalDate !== undefined && { renewalDate: data.renewalDate ? new Date(data.renewalDate) : null }),
        ...(data.renewalAmount !== undefined && { renewalAmount: data.renewalAmount }),
      }
    });

    try {
      revalidatePath("/dashboard/crm");
      revalidatePath(`/dashboard/crm/${id}`);
    } catch {}

    return updated;
  } catch (error) {
    console.error("Failed to update client:", error);
    throw new Error(`Failed to update client: ${error instanceof Error ? error.message : String(error)}`);
  }
}
