"use server";

import { LeadStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function getLeads() {
  const session = await requireRole(["ADMIN", "SDR", "BDE"]);
  try {
    if (session.role === "ADMIN") {
      const leads = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "leads" ORDER BY "createdAt" DESC`
      );
      return leads;
    } else if (session.role === "SDR") {
      // SDR sees: own assigned leads + Shared Pool unassigned leads (excluding BDE field leads)
      const leads = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "leads" 
         WHERE "assignedSdrId" = $1 
            OR ("assignedSdrId" IS NULL AND ("source" IS NULL OR "source" != 'BDE Field'))
         ORDER BY "createdAt" DESC`,
        session.userId
      );
      return leads;
    } else if (session.role === "BDE") {
      // BDE sees: BDE Field leads + leads assigned to this BDE
      const leads = await prisma.$queryRawUnsafe<any[]>(
        `SELECT * FROM "leads" 
         WHERE "source" = 'BDE Field' 
            OR "assignedSdrId" = $1
         ORDER BY "createdAt" DESC`,
        session.userId
      );
      return leads;
    }
    return [];
  } catch (error) {
    console.error("Failed to fetch leads:", error);
    return [];
  }
}

export async function createRawLead(data: { clientName: string; clientPhone?: string; clientEmail?: string; businessName?: string; source?: string; service?: string; comment?: string; imageUrl?: string }) {
  const session = await requireRole(["ADMIN", "SDR", "BDE"]);
  try {
    const assignedSdrId = session.role === "SDR" ? session.userId : undefined;
    const source = session.role === "BDE" ? (data.source || "BDE Field") : data.source;

    const lead = await prisma.lead.create({
      data: {
        ...data,
        source: source,
        assignedSdrId: assignedSdrId,
        status: "PENDING"
      },
    });
    try { revalidatePath("/dashboard/sdr"); } catch {}
    return lead;
  } catch (error) {
    console.error("Failed to create raw lead:", error);
    throw new Error("Failed to create raw lead");
  }
}

export async function bulkCreateRawLeads(leadsData: { clientName: string; clientPhone?: string; clientEmail?: string; businessName?: string; source?: string; service?: string; comment?: string; imageUrl?: string }[]) {
  const session = await requireRole(["ADMIN", "SDR"]);
  try {
    const assignedSdrId = session.role === "SDR" ? session.userId : undefined;
    const leads = leadsData.map(data => ({
      ...data,
      assignedSdrId: assignedSdrId,
      status: "PENDING" as LeadStatus
    }));
    
    const result = await prisma.lead.createMany({
      data: leads,
      skipDuplicates: true,
    });
    
    try { revalidatePath("/dashboard/sdr"); } catch {}
    return { count: result.count };
  } catch (error) {
    console.error("Failed to bulk create leads:", error);
    throw new Error("Failed to bulk create raw leads");
  }
}

export async function deleteRawLead(id: string) {
  const session = await requireRole(["ADMIN", "SDR"]);
  try {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return;

    if (session.role === "SDR" && existing.assignedSdrId && existing.assignedSdrId !== session.userId) {
      throw new Error("FORBIDDEN: You cannot delete another SDR's private lead.");
    }

    await prisma.lead.delete({
      where: { id }
    });
    try { revalidatePath("/dashboard/sdr"); } catch {}
  } catch (error) {
    console.error("Failed to delete raw lead:", error);
    throw new Error("Failed to delete raw lead");
  }
}

export async function deleteAllLeads() {
  await requireRole(["ADMIN"]);
  try {
    await prisma.lead.deleteMany({});
    try {
      revalidatePath("/dashboard/sdr");
      revalidatePath("/dashboard/bde");
      revalidatePath("/ceo/dashboard");
    } catch {}
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
  const session = await requireRole(["ADMIN", "SDR", "BDE"]);
  try {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Lead not found");
    }

    if (session.role === "SDR") {
      if (existing.assignedSdrId && existing.assignedSdrId !== session.userId) {
        throw new Error("FORBIDDEN: You are not authorized to update another SDR's assigned lead.");
      }
    } else if (session.role === "BDE") {
      if (existing.source !== "BDE Field" && existing.assignedSdrId !== session.userId) {
        throw new Error("FORBIDDEN: You are not authorized to update this lead.");
      }
    }

    if (session.role === "SDR" && !existing.assignedSdrId) {
      await prisma.$executeRawUnsafe(
        `UPDATE "leads" SET "assignedSdrId" = $1 WHERE "id" = $2 AND "assignedSdrId" IS NULL`,
        session.userId,
        id
      );
    }

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
    try {
      revalidatePath("/dashboard/sdr");
      revalidatePath("/dashboard/sdr/pipeline");
      revalidatePath("/dashboard/bde");
      revalidatePath("/dashboard/bde/pipeline");
    } catch {}
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
  const session = await requireRole(["ADMIN", "SDR", "BDE"]);
  try {
    if (!id) throw new Error("Lead ID is required");

    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) {
      throw new Error("Lead not found");
    }

    if (session.role === "SDR") {
      if (existing.assignedSdrId && existing.assignedSdrId !== session.userId) {
        throw new Error("FORBIDDEN: You cannot schedule follow-up for another SDR's lead.");
      }
    }

    const d = new Date(followUpDateISO);
    const validDate = isNaN(d.getTime()) ? new Date() : d;

    if (session.role === "SDR" && !existing.assignedSdrId) {
      await prisma.$executeRawUnsafe(
        `UPDATE "leads" SET "assignedSdrId" = $1 WHERE "id" = $2 AND "assignedSdrId" IS NULL`,
        session.userId,
        id
      );
    }

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
    try {
      revalidatePath("/dashboard/sdr");
      revalidatePath("/dashboard/sdr/pipeline");
      revalidatePath("/dashboard/bde");
      revalidatePath("/dashboard/bde/pipeline");
    } catch {}
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
  const session = await requireRole(["ADMIN", "BDE", "SDR"]);
  try {
    if (contractValue < 0 || advanceAmount < 0 || renewalAmount < 0) {
      throw new Error("INVALID_INPUT: Amounts cannot be negative.");
    }
    if (advanceAmount > contractValue && contractValue > 0) {
      throw new Error("INVALID_INPUT: Advance amount cannot exceed contract value.");
    }

    const client = await prisma.$transaction(async (tx) => {
      // 1. Fetch lead for data extraction & authorization checks
      const lead = await tx.lead.findUnique({
        where: { id: leadId },
      });

      if (!lead) throw new Error("Lead not found");

      // 2. SDR authorization check
      if (session.role === "SDR" && lead.assignedSdrId && lead.assignedSdrId !== session.userId) {
        throw new Error("FORBIDDEN: You cannot convert another SDR's lead.");
      }

      // 3. ATOMIC CONVERSION CLAIM
      // Attempts to lock and update status from non-CONVERTED to CONVERTED in a single atomic DB operation.
      // If another concurrent transaction claimed it first, claimed.count will be 0.
      const claimed = await tx.lead.updateMany({
        where: {
          id: leadId,
          status: { not: "CONVERTED" }
        },
        data: {
          status: "CONVERTED"
        }
      });

      if (claimed.count !== 1) {
        throw new Error("CONFLICT: Lead has already been converted to a client or is being processed.");
      }

      // 4. Determine service type
      let serviceType: "FBP" | "TECH" | "HYBRID" = "FBP";
      const sUpper = (lead.service || "").toUpperCase();
      if (sUpper.includes("TECH") || sUpper.includes("WEB") || sUpper.includes("API") || sUpper.includes("DEV") || sUpper.includes("SOFTWARE") || sUpper.includes("APP")) {
        serviceType = "TECH";
      } else if (sUpper.includes("HYBRID") || sUpper.includes("COMBO")) {
        serviceType = "HYBRID";
      }

      // 5. Calculate Renewal Date if recurring
      let calculatedRenewalDate: Date | null = null;
      if (billingModel === "RECURRING" && renewalAmount > 0) {
        calculatedRenewalDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      // 6. Create Client record (happens AFTER successful atomic claim)
      const createdClient = await tx.client.create({
        data: {
          companyName: lead.businessName || lead.clientName || "Unnamed Company",
          contactPerson: lead.clientName || "Unknown Contact",
          email: lead.clientEmail || null,
          phone: lead.clientPhone || null,
          serviceType: serviceType,
          billingModel: billingModel,
          contractValue: contractValue || 0,
          renewalAmount: renewalAmount || 0,
          renewalDate: calculatedRenewalDate,
          status: "ACTIVE",
          notes: notes || lead.comment || "Converted from Sales Pipeline",
          salesCloseDate: new Date(),
          assignedBdeId: session.role === "BDE" ? session.userId : undefined,
        },
      });

      // 7. Create Project record
      const projTitle = projectName || `${createdClient.companyName} - ${serviceType} Execution`;
      const projType = serviceType === "TECH" ? "TECH" : serviceType === "HYBRID" ? "HYBRID" : "FBP";
      const projDeadline = deadline ? new Date(deadline) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await tx.project.create({
        data: {
          name: projTitle,
          description: notes || `Project launched for ${createdClient.companyName}`,
          type: projType as any,
          status: "IN_PROGRESS",
          startDate: new Date(),
          deadline: projDeadline,
          progress: 0,
          clientId: createdClient.id,
        },
      });

      // 8. Create Revenue Entry ONLY when advanceAmount > 0
      if (advanceAmount > 0) {
        await tx.revenueEntry.create({
          data: {
            amount: advanceAmount,
            paymentDate: new Date(),
            revenueType: serviceType as any,
            paymentStatus: "PAID",
            description: `Advance Payment collected on Closed Deal (${createdClient.companyName})`,
            clientId: createdClient.id,
          },
        });
      }

      return createdClient;
    });

    try {
      revalidatePath("/dashboard/sdr");
      revalidatePath("/dashboard/sdr/pipeline");
      revalidatePath("/dashboard/bde");
      revalidatePath("/dashboard/bde/pipeline");
      revalidatePath("/dashboard/crm");
      revalidatePath("/dashboard/projects");
      revalidatePath("/dashboard/finance");
    } catch {}
    return client;
  } catch (error) {
    console.error("Failed to convert lead to client:", error);
    throw new Error(`Failed to convert lead to client: ${error instanceof Error ? error.message : String(error)}`);
  }
}
