"use server";

import { LeadStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function getLeads() {
  const session = await requireRole(["ADMIN", "SDR", "BDE"]);
  try {
    if (session.role === "ADMIN") {
      const leads = await prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
      });
      return leads;
    } else if (session.role === "SDR") {
      // SDR sees: own assigned leads + Shared Pool unassigned leads (excluding BDE field leads)
      const leads = await prisma.lead.findMany({
        where: {
          OR: [
            { assignedSdrId: session.userId },
            {
              assignedSdrId: null,
              OR: [
                { source: null },
                { source: { not: "BDE Field" } },
              ],
            },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
      return leads;
    } else if (session.role === "BDE") {
      // BDE sees: leads assigned to this BDE + unassigned BDE Field shared pool leads
      const leads = await prisma.lead.findMany({
        where: {
          OR: [
            { assignedBdeId: session.userId },
            {
              assignedBdeId: null,
              source: "BDE Field",
            },
          ],
        },
        orderBy: { createdAt: "desc" },
      });
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
    const assignedBdeId = session.role === "BDE" ? session.userId : undefined;
    const source = session.role === "BDE" ? (data.source || "BDE Field") : data.source;

    const lead = await prisma.lead.create({
      data: {
        ...data,
        source: source,
        assignedSdrId: assignedSdrId,
        assignedBdeId: assignedBdeId,
        status: "PENDING"
      },
    });
    try { revalidatePath("/dashboard/sdr"); revalidatePath("/dashboard/bde"); } catch {}
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
  throw new Error("DISABLED: Bulk deletion of all leads is disabled for data integrity & history protection.");
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
      if (existing.assignedBdeId && existing.assignedBdeId !== session.userId) {
        throw new Error("FORBIDDEN: You are not authorized to update another BDE's assigned lead.");
      }
      if (!existing.assignedBdeId && existing.source !== "BDE Field") {
        throw new Error("FORBIDDEN: You are not authorized to update this lead.");
      }
    }

    // Determine auto-assignment when claiming an unassigned lead
    let autoAssignedSdrId = undefined;
    if (session.role === "SDR" && !existing.assignedSdrId) {
      autoAssignedSdrId = session.userId;
    }

    let autoAssignedBdeId = undefined;
    if (session.role === "BDE" && !existing.assignedBdeId && existing.source === "BDE Field") {
      autoAssignedBdeId = session.userId;
    }

    const updateData: any = {
      status: status as LeadStatus,
      ...(autoAssignedSdrId && { assignedSdrId: autoAssignedSdrId }),
      ...(autoAssignedBdeId && { assignedBdeId: autoAssignedBdeId }),
    };

    if (followUpDate !== undefined) {
      updateData.followUpDate = followUpDate ? new Date(followUpDate) : null;
    }
    if (followUpNote !== undefined) {
      updateData.followUpNote = followUpNote || null;
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: updateData,
    });

    try {
      revalidatePath("/dashboard/sdr");
      revalidatePath("/dashboard/sdr/pipeline");
      revalidatePath("/dashboard/bde");
      revalidatePath("/dashboard/bde/pipeline");
    } catch {}
    return updatedLead;
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
    } else if (session.role === "BDE") {
      if (existing.assignedBdeId && existing.assignedBdeId !== session.userId) {
        throw new Error("FORBIDDEN: You cannot schedule follow-up for another BDE's lead.");
      }
      if (!existing.assignedBdeId && existing.source !== "BDE Field") {
        throw new Error("FORBIDDEN: You cannot schedule follow-up for this lead.");
      }
    }

    const d = new Date(followUpDateISO);
    const validDate = isNaN(d.getTime()) ? new Date() : d;

    let autoAssignedSdrId = undefined;
    if (session.role === "SDR" && !existing.assignedSdrId) {
      autoAssignedSdrId = session.userId;
    }

    let autoAssignedBdeId = undefined;
    if (session.role === "BDE" && !existing.assignedBdeId && existing.source === "BDE Field") {
      autoAssignedBdeId = session.userId;
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        status: "WARM_LEAD" as LeadStatus,
        followUpDate: validDate,
        followUpNote: followUpNote || null,
        ...(autoAssignedSdrId && { assignedSdrId: autoAssignedSdrId }),
        ...(autoAssignedBdeId && { assignedBdeId: autoAssignedBdeId }),
      },
    });

    try {
      revalidatePath("/dashboard/sdr");
      revalidatePath("/dashboard/sdr/pipeline");
      revalidatePath("/dashboard/bde");
      revalidatePath("/dashboard/bde/pipeline");
    } catch {}
    return updatedLead;
  } catch (error) {
    console.error("Failed to schedule follow up:", error);
    throw new Error(`Failed to schedule follow up: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function assignLeadToBde(leadId: string, bdeId: string | null) {
  const session = await requireRole(["ADMIN"]);
  try {
    const existing = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!existing) throw new Error("Lead not found");

    const updated = await prisma.lead.update({
      where: { id: leadId },
      data: { assignedBdeId: bdeId || null }
    });

    try {
      revalidatePath("/dashboard/sdr");
      revalidatePath("/dashboard/bde");
      revalidatePath("/dashboard/crm");
    } catch {}

    return updated;
  } catch (error) {
    console.error("Failed to assign lead to BDE:", error);
    throw new Error(`Failed to assign lead to BDE: ${error instanceof Error ? error.message : String(error)}`);
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

      // 2. Authorization checks
      if (session.role === "SDR" && lead.assignedSdrId && lead.assignedSdrId !== session.userId) {
        throw new Error("FORBIDDEN: You cannot convert another SDR's lead.");
      }
      if (session.role === "BDE") {
        if (lead.assignedBdeId && lead.assignedBdeId !== session.userId) {
          throw new Error("FORBIDDEN: You cannot convert another BDE's assigned lead.");
        }
        if (!lead.assignedBdeId && lead.source !== "BDE Field") {
          throw new Error("FORBIDDEN: You are not authorized to convert this lead.");
        }
      }

      // 3. Determine BDE attribution
      // Priority 1: Persisted Lead.assignedBdeId
      // Priority 2: If current session is BDE, current session BDE user ID
      let finalBdeId = lead.assignedBdeId || (session.role === "BDE" ? session.userId : undefined);

      // 4. ATOMIC CONVERSION CLAIM
      // Attempts to lock and update status from non-CONVERTED to CONVERTED in a single atomic DB operation,
      // and sets assignedBdeId to finalBdeId if claimed.
      const claimed = await tx.lead.updateMany({
        where: {
          id: leadId,
          status: { not: "CONVERTED" }
        },
        data: {
          status: "CONVERTED",
          assignedBdeId: finalBdeId || undefined,
        }
      });

      if (claimed.count !== 1) {
        throw new Error("CONFLICT: Lead has already been converted to a client or is being processed.");
      }

      // 5. Determine service type
      let serviceType: "FBP" | "TECH" | "HYBRID" = "FBP";
      const sUpper = (lead.service || "").toUpperCase();
      if (sUpper.includes("TECH") || sUpper.includes("WEB") || sUpper.includes("API") || sUpper.includes("DEV") || sUpper.includes("SOFTWARE") || sUpper.includes("APP")) {
        serviceType = "TECH";
      } else if (sUpper.includes("HYBRID") || sUpper.includes("COMBO")) {
        serviceType = "HYBRID";
      }

      // 6. Calculate Renewal Date if recurring
      let calculatedRenewalDate: Date | null = null;
      if (billingModel === "RECURRING" && renewalAmount > 0) {
        calculatedRenewalDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      }

      // 7. Create Client record (carrying persistent BDE attribution)
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
          assignedBdeId: finalBdeId || undefined,
          originLeadId: lead.id,
        },
      });

      // 8. Create Project record
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

      // 9. Create Revenue Entry ONLY when advanceAmount > 0
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
