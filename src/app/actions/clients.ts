"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getClients() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
    });
    return clients;
  } catch (error) {
    console.error("Failed to fetch clients:", error);
    return [];
  }
}

export async function deleteClient(id: string) {
  try {
    await prisma.revenueEntry.deleteMany({ where: { clientId: id } });
    await prisma.task.deleteMany({ where: { project: { clientId: id } } });
    await prisma.project.deleteMany({ where: { clientId: id } });
    await prisma.ticketComment.deleteMany({ where: { ticket: { clientId: id } } });
    await prisma.supportTicket.deleteMany({ where: { clientId: id } });
    await prisma.client.delete({ where: { id } });
    revalidatePath("/dashboard/crm");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete client:", error);
    try {
      await prisma.$executeRawUnsafe(`DELETE FROM "revenue_entries" WHERE "clientId" = $1`, id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM "projects" WHERE "clientId" = $1`, id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM "support_tickets" WHERE "clientId" = $1`, id).catch(() => {});
      await prisma.$executeRawUnsafe(`DELETE FROM "clients" WHERE "id" = $1`, id);
      revalidatePath("/dashboard/crm");
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
}) {
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

  const salesCloseDate = data.salesCloseDate ? new Date(data.salesCloseDate) : new Date();
  
  // Calculate default +1 year renewal date if not provided
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
      } as any,
    });
    revalidatePath("/dashboard/crm");
    return client;
  } catch (error) {
    console.warn("Prisma ORM create failed, attempting direct raw SQL insert fallback:", error);
    try {
      const id = "cl_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      await prisma.$executeRawUnsafe(
        `INSERT INTO "clients" ("id", "companyName", "contactPerson", "email", "phone", "serviceType", "billingModel", "contractValue", "renewalAmount", "status", "industry", "notes", "salesCloseDate", "renewalDate", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6::"ServiceType", $7, $8, $9, $10::"ClientStatus", $11, $12, $13, $14, NOW(), NOW())`,
        id, companyName, contactPerson, email, phone, serviceType, billingModel, contractValue, renewalAmount, status, industry, notes, salesCloseDate, renewalDate
      );
      revalidatePath("/dashboard/crm");
      return { id, companyName, contactPerson, email, phone, serviceType, billingModel, contractValue, renewalAmount, status, industry, notes };
    } catch (rawErr) {
      console.error("Failed to create client with raw SQL fallback:", rawErr);
      throw new Error(`Failed to create client: ${rawErr instanceof Error ? rawErr.message : String(rawErr)}`);
    }
  }
}
