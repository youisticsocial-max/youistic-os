"use server";

import { LeadStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getLeads() {
  try {
    // Migrate any legacy 'NEW' status leads to 'PENDING'
    await prisma.$executeRawUnsafe(
      `UPDATE "leads" SET "status" = 'PENDING'::"LeadStatus" WHERE "status" = 'NEW'::"LeadStatus"`
    ).catch(() => {});

    const leads = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "leads" ORDER BY "createdAt" DESC`
    );
    return leads;
  } catch (error) {
    console.error("Failed to fetch leads:", error);
    return [];
  }
}

export async function createRawLead(data: { clientName: string; clientPhone?: string; clientEmail?: string; businessName?: string; source?: string; service?: string; comment?: string; imageUrl?: string }) {
  try {
    const lead = await prisma.lead.create({
      data: {
        ...data,
        status: "PENDING"
      },
    });
    revalidatePath("/dashboard/sdr");
    return lead;
  } catch (error) {
    console.error("Failed to create raw lead:", error);
    throw new Error("Failed to create raw lead");
  }
}

export async function bulkCreateRawLeads(leadsData: { clientName: string; clientPhone?: string; clientEmail?: string; businessName?: string; source?: string; service?: string; comment?: string; imageUrl?: string }[]) {
  try {
    const leads = leadsData.map(data => ({
      ...data,
      status: "PENDING" as LeadStatus
    }));
    
    const result = await prisma.lead.createMany({
      data: leads,
      skipDuplicates: true,
    });
    
    revalidatePath("/dashboard/sdr");
    return { count: result.count };
  } catch (error) {
    console.error("Failed to bulk create leads:", error);
    throw new Error("Failed to bulk create raw leads");
  }
}

export async function deleteRawLead(id: string) {
  try {
    await prisma.lead.delete({
      where: { id }
    });
    revalidatePath("/dashboard/sdr");
  } catch (error) {
    console.error("Failed to delete raw lead:", error);
    throw new Error("Failed to delete raw lead");
  }
}

export async function deleteAllLeads() {
  try {
    await prisma.lead.deleteMany({});
    revalidatePath("/dashboard/sdr");
    revalidatePath("/dashboard/bde");
    revalidatePath("/ceo/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete all leads:", error);
    throw error;
  }
}

export async function updateLeadStatus(
  id: string, 
  status: LeadStatus | string, 
  followUpDate?: Date | string | null, 
  followUpNote?: string | null
) {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "leads" SET "status" = $1::"LeadStatus", "updatedAt" = NOW() WHERE "id" = $2`,
      status,
      id
    );

    if (followUpDate !== undefined) {
      const d = followUpDate ? new Date(followUpDate) : null;
      await prisma.$executeRawUnsafe(
        `UPDATE "leads" SET "followUpDate" = $1 WHERE "id" = $2`,
        d,
        id
      );
    }
    if (followUpNote !== undefined) {
      await prisma.$executeRawUnsafe(
        `UPDATE "leads" SET "followUpNote" = $1 WHERE "id" = $2`,
        followUpNote || null,
        id
      );
    }

    const leads = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "leads" WHERE "id" = $1`,
      id
    );
    revalidatePath("/dashboard/sdr");
    revalidatePath("/dashboard/sdr/pipeline");
    revalidatePath("/dashboard/bde");
    revalidatePath("/dashboard/bde/pipeline");
    return leads[0] || null;
  } catch (error) {
    console.error("Failed to update lead status:", error);
    throw new Error(`Failed to update lead status: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function scheduleLeadFollowUp(
  id: string, 
  followUpDateISO: string, 
  followUpNote?: string
) {
  try {
    if (!id) throw new Error("Lead ID is required");
    const d = new Date(followUpDateISO);
    const validDate = isNaN(d.getTime()) ? new Date() : d;

    await prisma.$executeRawUnsafe(
      `UPDATE "leads" SET "status" = 'WARM_LEAD'::"LeadStatus", "followUpDate" = $1, "followUpNote" = $2, "updatedAt" = NOW() WHERE "id" = $3`,
      validDate,
      followUpNote || null,
      id
    );

    const leads = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "leads" WHERE "id" = $1`,
      id
    );
    revalidatePath("/dashboard/sdr");
    revalidatePath("/dashboard/sdr/pipeline");
    revalidatePath("/dashboard/bde");
    revalidatePath("/dashboard/bde/pipeline");
    return leads[0] || null;
  } catch (error) {
    console.error("Failed to schedule follow up:", error);
    throw new Error(`Failed to schedule follow up: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function convertLeadToClient(
  leadId: string, 
  contractValue: number, 
  notes?: string,
  advanceAmount: number = 0,
  projectName?: string,
  deadline?: Date | string | null,
  billingModel: "ONE_TIME" | "RECURRING" = "ONE_TIME",
  renewalAmount: number = 0
) {
  try {
    const leads = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "leads" WHERE "id" = $1`,
      leadId
    );
    const lead = leads[0];
    if (!lead) throw new Error("Lead not found");

    // Update lead status to CONVERTED
    await prisma.$executeRawUnsafe(
      `UPDATE "leads" SET "status" = 'CONVERTED'::"LeadStatus", "updatedAt" = NOW() WHERE "id" = $1`,
      leadId
    );

    // Create client record in Client table
    let serviceType: "FBP" | "TECH" | "HYBRID" = "FBP";
    const sUpper = (lead.service || "").toUpperCase();
    if (sUpper.includes("TECH") || sUpper.includes("WEB") || sUpper.includes("API") || sUpper.includes("DEV") || sUpper.includes("SOFTWARE") || sUpper.includes("APP")) {
      serviceType = "TECH";
    } else if (sUpper.includes("HYBRID") || sUpper.includes("COMBO")) {
      serviceType = "HYBRID";
    }

    const client = await prisma.client.create({
      data: {
        companyName: lead.businessName || lead.clientName,
        contactPerson: lead.clientName,
        email: lead.clientEmail || null,
        phone: lead.clientPhone || null,
        serviceType: serviceType,
        billingModel: billingModel,
        contractValue: contractValue || 0,
        renewalAmount: renewalAmount || 0,
        status: "ACTIVE",
        notes: notes || lead.comment || "Converted from Sales Pipeline",
        salesCloseDate: new Date(),
      } as any,
    });

    // Automatically create Active Project in Project Hub
    const projTitle = projectName || `${lead.businessName || lead.clientName} - ${serviceType} Execution`;
    const projType = serviceType === "TECH" ? "TECH" : serviceType === "HYBRID" ? "HYBRID" : "FBP";
    const projDeadline = deadline ? new Date(deadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.project.create({
      data: {
        name: projTitle,
        description: notes || `Project launched for ${client.companyName}`,
        type: projType as any,
        status: "IN_PROGRESS",
        startDate: new Date(),
        deadline: projDeadline,
        progress: 0,
        clientId: client.id,
      },
    });

    // Automatically log Revenue Entry in Finance if advance collected
    if (advanceAmount > 0) {
      await prisma.revenueEntry.create({
        data: {
          amount: advanceAmount,
          paymentDate: new Date(),
          revenueType: serviceType as any,
          paymentStatus: "PAID",
          description: `Advance Payment collected on Closed Deal`,
          clientId: client.id,
        },
      });
    }

    revalidatePath("/dashboard/sdr");
    revalidatePath("/dashboard/sdr/pipeline");
    revalidatePath("/dashboard/bde");
    revalidatePath("/dashboard/bde/pipeline");
    revalidatePath("/dashboard/crm");
    revalidatePath("/dashboard/projects");
    revalidatePath("/dashboard/finance");
    return client;
  } catch (error) {
    console.error("Failed to convert lead to client:", error);
    throw new Error(`Failed to convert lead to client: ${error instanceof Error ? error.message : String(error)}`);
  }
}
