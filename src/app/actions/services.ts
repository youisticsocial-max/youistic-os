"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import {
  isValidServiceFamily,
  isValidRenewalFrequency,
  isValidServiceStatus,
  isNonNegativeFiniteAmount,
  isValidNonEmptyString,
  isBdeClientAuthorized
} from "@/lib/validation";
import { ServiceFamily, ServiceStatus, RenewalFrequency } from "@prisma/client";

// ==========================================
// SERVICE OFFERINGS (Catalogue Management)
// ==========================================

export async function getServiceOfferings(includeInactive = false) {
  const session = await requireRole(["ADMIN", "BDE", "SDR", "SUPPORT", "VIEWER"]);
  try {
    const where = includeInactive && session.role === "ADMIN" ? {} : { isActive: true };
    return await prisma.serviceOffering.findMany({
      where,
      orderBy: [{ family: "asc" }, { name: "asc" }],
    });
  } catch (error) {
    console.error("Failed to fetch service offerings:", error);
    return [];
  }
}

export async function createServiceOffering(data: {
  name: string;
  family: string;
  code?: string;
  description?: string;
}) {
  await requireRole(["ADMIN"]);

  if (!isValidNonEmptyString(data.name)) {
    throw new Error("INVALID_INPUT: Offering name is required.");
  }

  if (!isValidServiceFamily(data.family)) {
    throw new Error("INVALID_INPUT: Valid ServiceFamily is required.");
  }

  const code = data.code && isValidNonEmptyString(data.code) ? data.code.trim().toUpperCase() : null;

  const offering = await prisma.serviceOffering.create({
    data: {
      name: data.name.trim(),
      family: data.family as ServiceFamily,
      code,
      description: data.description ? data.description.trim() : null,
      isActive: true,
    },
  });

  revalidatePath("/dashboard/services");
  return offering;
}

export async function updateServiceOffering(
  id: string,
  data: {
    name?: string;
    family?: string;
    code?: string;
    description?: string;
    isActive?: boolean;
  }
) {
  await requireRole(["ADMIN"]);

  if (!isValidNonEmptyString(id)) {
    throw new Error("INVALID_INPUT: Offering ID is required.");
  }

  const existing = await prisma.serviceOffering.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("NOT_FOUND: Service offering not found.");
  }

  const updateData: any = {};

  if (data.name !== undefined) {
    if (!isValidNonEmptyString(data.name)) throw new Error("INVALID_INPUT: Name cannot be empty.");
    updateData.name = data.name.trim();
  }

  if (data.family !== undefined) {
    if (!isValidServiceFamily(data.family)) throw new Error("INVALID_INPUT: Invalid ServiceFamily.");
    updateData.family = data.family as ServiceFamily;
  }

  if (data.code !== undefined) {
    updateData.code = data.code ? data.code.trim().toUpperCase() : null;
  }

  if (data.description !== undefined) {
    updateData.description = data.description ? data.description.trim() : null;
  }

  if (data.isActive !== undefined) {
    updateData.isActive = Boolean(data.isActive);
  }

  const updated = await prisma.serviceOffering.update({
    where: { id },
    data: updateData,
  });

  revalidatePath("/dashboard/services");
  return updated;
}

// ==========================================
// CLIENT SERVICES & PER-SERVICE RENEWALS
// ==========================================

export async function getClientServices(clientId: string) {
  const session = await requireRole(["ADMIN", "BDE"]);

  if (!isValidNonEmptyString(clientId)) {
    throw new Error("INVALID_INPUT: Valid clientId is required.");
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: { id: true, assignedBdeId: true },
  });

  if (!client) {
    throw new Error("NOT_FOUND: Client not found.");
  }

  if (!isBdeClientAuthorized(client.assignedBdeId, session.userId, session.role)) {
    throw new Error("FORBIDDEN: You do not have authorization to view services for this client.");
  }

  return await prisma.clientService.findMany({
    where: { clientId },
    include: { offering: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function createClientService(data: {
  clientId: string;
  offeringId: string;
  status?: string;
  startDate?: string | Date;
  commercialValue?: number;
  renewalAmount?: number;
  renewalFrequency?: string;
  nextRenewalDate?: string | Date;
  notes?: string;
}) {
  await requireRole(["ADMIN"]);

  if (!isValidNonEmptyString(data.clientId)) {
    throw new Error("INVALID_INPUT: clientId is required.");
  }

  if (!isValidNonEmptyString(data.offeringId)) {
    throw new Error("INVALID_INPUT: offeringId is required.");
  }

  const client = await prisma.client.findUnique({ where: { id: data.clientId } });
  if (!client) {
    throw new Error("NOT_FOUND: Client not found.");
  }

  const offering = await prisma.serviceOffering.findUnique({ where: { id: data.offeringId } });
  if (!offering) {
    throw new Error("NOT_FOUND: Service offering not found.");
  }

  const status = data.status && isValidServiceStatus(data.status) ? (data.status as ServiceStatus) : ServiceStatus.ACTIVE;
  const renewalFrequency = data.renewalFrequency && isValidRenewalFrequency(data.renewalFrequency)
    ? (data.renewalFrequency as RenewalFrequency)
    : RenewalFrequency.NONE;

  let commercialValue: number | null = null;
  if (data.commercialValue !== undefined && data.commercialValue !== null && (data.commercialValue as any) !== "") {
    if (!isNonNegativeFiniteAmount(data.commercialValue)) {
      throw new Error("INVALID_INPUT: commercialValue must be a non-negative finite number.");
    }
    commercialValue = Number(data.commercialValue);
  }

  let renewalAmount: number | null = null;
  if (data.renewalAmount !== undefined && data.renewalAmount !== null && (data.renewalAmount as any) !== "") {
    if (!isNonNegativeFiniteAmount(data.renewalAmount)) {
      throw new Error("INVALID_INPUT: renewalAmount must be a non-negative finite number.");
    }
    renewalAmount = Number(data.renewalAmount);
  }

  let startDate: Date | null = null;
  if (data.startDate) {
    const parsed = new Date(data.startDate);
    if (!isNaN(parsed.getTime())) startDate = parsed;
  }

  let nextRenewalDate: Date | null = null;
  if (renewalFrequency !== RenewalFrequency.NONE && data.nextRenewalDate) {
    const parsed = new Date(data.nextRenewalDate);
    if (!isNaN(parsed.getTime())) nextRenewalDate = parsed;
  }

  const clientService = await prisma.clientService.create({
    data: {
      clientId: data.clientId,
      offeringId: data.offeringId,
      status,
      startDate,
      commercialValue,
      renewalAmount,
      renewalFrequency,
      nextRenewalDate,
      notes: data.notes && isValidNonEmptyString(data.notes) ? data.notes.trim() : null,
    },
    include: { offering: true },
  });

  revalidatePath(`/dashboard/crm/${data.clientId}`);
  revalidatePath("/dashboard/renewals");
  return clientService;
}

export async function updateClientService(
  id: string,
  data: {
    status?: string;
    startDate?: string | Date;
    commercialValue?: number | null;
    renewalAmount?: number | null;
    renewalFrequency?: string;
    nextRenewalDate?: string | Date | null;
    notes?: string;
  }
) {
  await requireRole(["ADMIN"]);

  if (!isValidNonEmptyString(id)) {
    throw new Error("INVALID_INPUT: Service ID is required.");
  }

  const existing = await prisma.clientService.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("NOT_FOUND: Client service record not found.");
  }

  const updateData: any = {};

  if (data.status !== undefined) {
    if (!isValidServiceStatus(data.status)) throw new Error("INVALID_INPUT: Invalid status.");
    updateData.status = data.status as ServiceStatus;
  }

  let targetFrequency = existing.renewalFrequency;
  if (data.renewalFrequency !== undefined) {
    if (!isValidRenewalFrequency(data.renewalFrequency)) throw new Error("INVALID_INPUT: Invalid renewalFrequency.");
    targetFrequency = data.renewalFrequency as RenewalFrequency;
    updateData.renewalFrequency = targetFrequency;
  }

  if (data.commercialValue !== undefined) {
    if (data.commercialValue === null || (data.commercialValue as any) === "") {
      updateData.commercialValue = null;
    } else {
      if (!isNonNegativeFiniteAmount(data.commercialValue)) throw new Error("INVALID_INPUT: Invalid commercialValue.");
      updateData.commercialValue = Number(data.commercialValue);
    }
  }

  if (data.renewalAmount !== undefined) {
    if (data.renewalAmount === null || (data.renewalAmount as any) === "") {
      updateData.renewalAmount = null;
    } else {
      if (!isNonNegativeFiniteAmount(data.renewalAmount)) throw new Error("INVALID_INPUT: Invalid renewalAmount.");
      updateData.renewalAmount = Number(data.renewalAmount);
    }
  }

  if (data.startDate !== undefined) {
    if (data.startDate === null || data.startDate === "") {
      updateData.startDate = null;
    } else {
      const parsed = new Date(data.startDate);
      if (isNaN(parsed.getTime())) throw new Error("INVALID_INPUT: Invalid startDate.");
      updateData.startDate = parsed;
    }
  }

  if (targetFrequency === RenewalFrequency.NONE) {
    updateData.nextRenewalDate = null;
  } else if (data.nextRenewalDate !== undefined) {
    if (data.nextRenewalDate === null || data.nextRenewalDate === "") {
      updateData.nextRenewalDate = null;
    } else {
      const parsed = new Date(data.nextRenewalDate);
      if (isNaN(parsed.getTime())) throw new Error("INVALID_INPUT: Invalid nextRenewalDate.");
      updateData.nextRenewalDate = parsed;
    }
  }

  if (data.notes !== undefined) {
    updateData.notes = data.notes ? String(data.notes).trim() : null;
  }

  const updated = await prisma.clientService.update({
    where: { id },
    data: updateData,
    include: { offering: true },
  });

  revalidatePath(`/dashboard/crm/${existing.clientId}`);
  revalidatePath("/dashboard/renewals");
  return updated;
}

export async function getUpcomingRenewals(daysWindow: number = 30) {
  const session = await requireRole(["ADMIN", "BDE"]);

  const windowDays = Math.max(1, Math.min(365, Number(daysWindow) || 30));
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(now.getDate() + windowDays);

  const whereClause: any = {
    status: ServiceStatus.ACTIVE,
    renewalFrequency: {
      not: RenewalFrequency.NONE,
    },
    nextRenewalDate: {
      not: null,
      lte: futureDate,
    },
  };

  if (session.role === "BDE") {
    whereClause.client = {
      assignedBdeId: session.userId,
    };
  }

  return await prisma.clientService.findMany({
    where: whereClause,
    include: {
      client: {
        select: {
          id: true,
          companyName: true,
          contactPerson: true,
          assignedBde: { select: { id: true, name: true, email: true } },
        },
      },
      offering: true,
    },
    orderBy: { nextRenewalDate: "asc" },
  });
}
