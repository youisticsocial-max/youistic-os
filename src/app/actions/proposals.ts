"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";

export async function createProposal(data: {
  leadId: string;
  title: string;
  packageType?: string;
  deliverables?: string;
  grossAmount: number;
  discountAmount?: number;
  validityDays?: number;
  paymentTerms?: string;
  specialTerms?: string;
  status?: "DRAFT" | "SENT";
}) {
  const session = await requireRole(["ADMIN", "SDR", "BDE"]);
  try {
    if (!data.leadId) throw new Error("INVALID_INPUT: Lead ID is required.");
    if (!data.title || !data.title.trim()) throw new Error("INVALID_INPUT: Proposal title is required.");

    const lead = await prisma.lead.findUnique({ where: { id: data.leadId } });
    if (!lead) throw new Error("Lead not found");

    if (session.role === "SDR" && lead.assignedSdrId && lead.assignedSdrId !== session.userId) {
      throw new Error("FORBIDDEN: You cannot create a proposal for another SDR's lead.");
    }

    if (session.role === "BDE") {
      if (lead.assignedBdeId && lead.assignedBdeId !== session.userId) {
        throw new Error("FORBIDDEN: You cannot create a proposal for another BDE's lead.");
      }
      if (!lead.assignedBdeId && lead.source !== "BDE Field") {
        throw new Error("FORBIDDEN: You are not authorized to create a proposal for this lead.");
      }
    }

    const grossAmount = typeof data.grossAmount === "number" ? data.grossAmount : parseFloat(data.grossAmount as any);
    const discountAmount = typeof data.discountAmount === "number" ? data.discountAmount : parseFloat((data.discountAmount || 0) as any);
    const validityDays = typeof data.validityDays === "number" ? data.validityDays : parseInt((data.validityDays || 15) as any, 10);

    if (isNaN(grossAmount) || !isFinite(grossAmount) || grossAmount < 0) {
      throw new Error("INVALID_INPUT: Gross amount must be a non-negative number.");
    }
    if (isNaN(discountAmount) || !isFinite(discountAmount) || discountAmount < 0) {
      throw new Error("INVALID_INPUT: Discount amount must be a non-negative number.");
    }
    if (discountAmount > grossAmount) {
      throw new Error("INVALID_INPUT: Discount amount cannot exceed gross amount.");
    }
    if (isNaN(validityDays) || validityDays <= 0 || !Number.isInteger(validityDays)) {
      throw new Error("INVALID_INPUT: Validity days must be a positive integer.");
    }

    const finalAmount = Math.max(0, grossAmount - discountAmount);
    const initialStatus = data.status === "SENT" ? "SENT" : "DRAFT";
    const sentAt = initialStatus === "SENT" ? new Date() : null;

    const proposal = await prisma.$transaction(async (tx) => {
      const created = await tx.proposal.create({
        data: {
          title: data.title.trim(),
          packageType: data.packageType || null,
          deliverables: data.deliverables || null,
          grossAmount,
          discountAmount,
          finalAmount,
          validityDays,
          paymentTerms: data.paymentTerms || null,
          specialTerms: data.specialTerms || null,
          status: initialStatus,
          sentAt,
          leadId: lead.id,
          createdById: session.userId,
        },
      });

      if (initialStatus === "SENT" && lead.status !== "CONVERTED") {
        await tx.lead.update({
          where: { id: lead.id },
          data: { status: "PROPOSAL_SENT" },
        });
      }

      return created;
    });

    try {
      revalidatePath("/dashboard/sdr");
      revalidatePath("/dashboard/sdr/pipeline");
      revalidatePath("/dashboard/bde");
      revalidatePath("/dashboard/bde/pipeline");
    } catch {}

    return proposal;
  } catch (error) {
    console.error("Failed to create proposal:", error);
    throw new Error(`Failed to create proposal: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function getProposalsForLead(leadId: string) {
  const session = await requireRole(["ADMIN", "SDR", "BDE"]);
  try {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return [];

    if (session.role === "SDR" && lead.assignedSdrId && lead.assignedSdrId !== session.userId) {
      throw new Error("FORBIDDEN: You cannot view proposals for another SDR's lead.");
    }

    if (session.role === "BDE") {
      if (lead.assignedBdeId && lead.assignedBdeId !== session.userId) {
        throw new Error("FORBIDDEN: You cannot view proposals for another BDE's lead.");
      }
      if (!lead.assignedBdeId && lead.source !== "BDE Field") {
        throw new Error("FORBIDDEN: You are not authorized to view proposals for this lead.");
      }
    }

    const proposals = await prisma.proposal.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return proposals;
  } catch (error) {
    console.error("Failed to fetch proposals for lead:", error);
    throw error;
  }
}

export async function getProposalById(proposalId: string) {
  const session = await requireRole(["ADMIN", "SDR", "BDE"]);
  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        lead: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!proposal) return null;

    if (session.role === "SDR" && proposal.lead.assignedSdrId && proposal.lead.assignedSdrId !== session.userId) {
      throw new Error("FORBIDDEN: You are not authorized to view another SDR's lead proposal.");
    }

    if (session.role === "BDE") {
      if (proposal.lead.assignedBdeId && proposal.lead.assignedBdeId !== session.userId) {
        throw new Error("FORBIDDEN: You are not authorized to view another BDE's lead proposal.");
      }
      if (!proposal.lead.assignedBdeId && proposal.lead.source !== "BDE Field") {
        throw new Error("FORBIDDEN: You are not authorized to view this lead proposal.");
      }
    }

    return proposal;
  } catch (error) {
    console.error("Failed to fetch proposal by ID:", error);
    throw error;
  }
}

export async function updateProposal(
  proposalId: string,
  data: {
    title?: string;
    packageType?: string;
    deliverables?: string;
    grossAmount?: number;
    discountAmount?: number;
    validityDays?: number;
    paymentTerms?: string;
    specialTerms?: string;
  }
) {
  const session = await requireRole(["ADMIN", "SDR", "BDE"]);
  try {
    const existing = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { lead: true },
    });

    if (!existing) throw new Error("Proposal not found");

    if (session.role === "SDR" && existing.lead.assignedSdrId && existing.lead.assignedSdrId !== session.userId) {
      throw new Error("FORBIDDEN: You cannot edit another SDR's proposal.");
    }

    if (session.role === "BDE" && existing.lead.assignedBdeId && existing.lead.assignedBdeId !== session.userId) {
      throw new Error("FORBIDDEN: You cannot edit another BDE's proposal.");
    }

    if (existing.status !== "DRAFT") {
      throw new Error("FORBIDDEN: Sent or finalized proposals cannot be overwritten. Generate a revised commercial offer instead.");
    }

    const title = data.title !== undefined ? data.title.trim() : existing.title;
    if (!title) throw new Error("INVALID_INPUT: Proposal title is required.");

    const grossAmount = data.grossAmount !== undefined ? Number(data.grossAmount) : existing.grossAmount;
    const discountAmount = data.discountAmount !== undefined ? Number(data.discountAmount) : existing.discountAmount;
    const validityDays = data.validityDays !== undefined ? Number(data.validityDays) : existing.validityDays;

    if (isNaN(grossAmount) || grossAmount < 0) {
      throw new Error("INVALID_INPUT: Gross amount must be a non-negative number.");
    }
    if (isNaN(discountAmount) || discountAmount < 0) {
      throw new Error("INVALID_INPUT: Discount amount must be a non-negative number.");
    }
    if (discountAmount > grossAmount) {
      throw new Error("INVALID_INPUT: Discount amount cannot exceed gross amount.");
    }
    if (isNaN(validityDays) || validityDays <= 0 || !Number.isInteger(validityDays)) {
      throw new Error("INVALID_INPUT: Validity days must be a positive integer.");
    }

    const finalAmount = Math.max(0, grossAmount - discountAmount);

    const updated = await prisma.proposal.update({
      where: { id: proposalId },
      data: {
        title,
        ...(data.packageType !== undefined && { packageType: data.packageType || null }),
        ...(data.deliverables !== undefined && { deliverables: data.deliverables || null }),
        grossAmount,
        discountAmount,
        finalAmount,
        validityDays,
        ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms || null }),
        ...(data.specialTerms !== undefined && { specialTerms: data.specialTerms || null }),
      },
    });

    try {
      revalidatePath("/dashboard/sdr");
      revalidatePath("/dashboard/sdr/pipeline");
      revalidatePath("/dashboard/bde");
      revalidatePath("/dashboard/bde/pipeline");
    } catch {}

    return updated;
  } catch (error) {
    console.error("Failed to update proposal:", error);
    throw new Error(`Failed to update proposal: ${error instanceof Error ? error.message : String(error)}`);
  }
}
