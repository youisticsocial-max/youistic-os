"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { FbpContentStage, FbpPlatform } from "@prisma/client";

export async function createFbpContentItem(data: {
  clientId: string;
  title: string;
  stage?: FbpContentStage;
  platform?: FbpPlatform;
  clientServiceId?: string;
  assignedToId?: string;
  scriptUrl?: string;
  rawMediaUrl?: string;
  editedMediaUrl?: string;
  notes?: string;
}) {
  const session = await requireRole(["ADMIN", "BDE"]);

  if (!data.title || !data.title.trim()) {
    throw new Error("INVALID_TITLE: Content title cannot be empty.");
  }

  // IDOR & Scope Check: BDE can only create content for assigned clients
  if (session.role === "BDE") {
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { assignedBdeId: true },
    });
    if (!client || client.assignedBdeId !== session.userId) {
      throw new Error("FORBIDDEN: You can only add FBP content items for your assigned clients.");
    }
  }

  // Cross-client service check
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
    const item = await prisma.fbpContentItem.create({
      data: {
        clientId: data.clientId,
        title: data.title.trim(),
        stage: data.stage || "IDEA",
        platform: data.platform || "INSTAGRAM",
        clientServiceId: data.clientServiceId || null,
        assignedToId: data.assignedToId || null,
        scriptUrl: data.scriptUrl?.trim() || null,
        rawMediaUrl: data.rawMediaUrl?.trim() || null,
        editedMediaUrl: data.editedMediaUrl?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    try {
      revalidatePath("/dashboard/crm/" + data.clientId);
      revalidatePath("/dashboard/fbp");
    } catch {}

    return item;
  } catch (error) {
    console.error("Failed to create FBP content item:", error);
    throw error;
  }
}

export async function updateFbpContentStage(
  id: string,
  stage: FbpContentStage
) {
  const session = await requireRole(["ADMIN", "BDE", "EDITOR"]);

  const existing = await prisma.fbpContentItem.findUnique({
    where: { id },
    include: { client: { select: { assignedBdeId: true } } },
  });

  if (!existing) {
    throw new Error("NOT_FOUND: FBP content item not found.");
  }

  if (session.role === "BDE" && existing.client.assignedBdeId !== session.userId) {
    throw new Error("FORBIDDEN: You can only update content items for your assigned clients.");
  }

  try {
    const updated = await prisma.fbpContentItem.update({
      where: { id },
      data: {
        stage,
        publishedDate: stage === "PUBLISHED" ? new Date() : existing.publishedDate,
      },
    });

    try {
      revalidatePath("/dashboard/crm/" + existing.clientId);
      revalidatePath("/dashboard/fbp");
    } catch {}

    return updated;
  } catch (error) {
    console.error("Failed to update FBP content stage:", error);
    throw error;
  }
}

export async function getFbpContentItems(params?: { clientId?: string; stage?: FbpContentStage }) {
  const session = await requireRole(["ADMIN", "BDE", "EDITOR", "SUPPORT"]);

  const where: any = {};

  if (params?.clientId) {
    where.clientId = params.clientId;
  }

  if (params?.stage) {
    where.stage = params.stage;
  }

  if (session.role === "BDE") {
    where.client = { assignedBdeId: session.userId };
  }

  return await prisma.fbpContentItem.findMany({
    where,
    include: {
      client: { select: { id: true, companyName: true } },
      assignedTo: { select: { id: true, name: true, role: true } },
      clientService: { include: { offering: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}
