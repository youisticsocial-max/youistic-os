"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth";

// Safe select payload - strictly excludes plaintext passwords, database URIs, API keys
const SAFE_ASSET_SELECT = {
  id: true,
  assetType: true,
  name: true,
  clientName: true,
  businessName: true,
  projectDescription: true,
  domainName: true,
  domainRegistrar: true,
  hostingProvider: true,
  hostingIp: true,
  hostingUser: true,
  figmaLink: true,
  githubRepo: true,
  prompts: true,
  vaultRef: true,
  notes: true,
  clientId: true,
  createdAt: true,
  updatedAt: true,
  client: {
    select: {
      id: true,
      companyName: true,
      contactPerson: true,
      assignedBdeId: true,
    },
  },
} as const;

/**
 * Helper to sanitize URLs by stripping inline HTTP user/password credentials
 * e.g., https://admin:secret123@example.com -> https://example.com
 */
function sanitizeUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.username || parsed.password) {
      parsed.username = "";
      parsed.password = "";
    }
    return parsed.toString();
  } catch {
    return trimmed.replace(/\/\/[^:]+:[^@]+@/, "//");
  }
}

/**
 * Fetch client assets using safe server select & role scoping.
 * ADMIN: access all
 * BDE: access assigned clients' assets + agency internal assets
 * SDR/OTHER: blocked (returns empty array)
 */
export async function getClientAssets(targetClientId?: string) {
  const session = await requireAuth();

  // SDR and unauthorized roles cannot view assets
  if (session.role === "SDR") {
    return [];
  }

  // Build Prisma query condition
  let whereCondition: any = {};

  if (targetClientId) {
    whereCondition.clientId = targetClientId;
  }

  if (session.role === "BDE") {
    whereCondition.OR = [
      { client: { assignedBdeId: session.userId } },
      { assetType: "AGENCY" },
    ];
  }

  try {
    const assets = await prisma.clientAsset.findMany({
      where: whereCondition,
      select: SAFE_ASSET_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return assets;
  } catch (error) {
    console.error("Failed to fetch client assets:", error);
    return [];
  }
}

/**
 * Fetch a single safe asset metadata record by ID with IDOR protection.
 */
export async function getClientAssetById(id: string) {
  const session = await requireAuth();

  if (session.role === "SDR") {
    return null;
  }

  try {
    const asset = await prisma.clientAsset.findUnique({
      where: { id },
      select: SAFE_ASSET_SELECT,
    });

    if (!asset) return null;

    // BDE authorization check
    if (
      session.role === "BDE" &&
      asset.assetType !== "AGENCY" &&
      asset.client?.assignedBdeId !== session.userId
    ) {
      return null;
    }

    return asset;
  } catch (error) {
    console.error("Failed to fetch client asset by ID:", error);
    return null;
  }
}

/**
 * Create a new safe client asset metadata record.
 * Accepts only explicit non-secret allowlisted fields.
 */
export async function createClientAsset(data: {
  assetType?: string;
  name?: string;
  clientName?: string;
  businessName?: string;
  projectDescription?: string;
  domainName?: string;
  domainRegistrar?: string;
  hostingProvider?: string;
  hostingIp?: string;
  hostingUser?: string;
  figmaLink?: string;
  githubRepo?: string;
  prompts?: string;
  vaultRef?: string;
  notes?: string;
  clientId?: string;
  // Ignore any attempts to pass secret keys
  [key: string]: any;
}) {
  const session = await requireRole(["ADMIN", "BDE"]);

  // If clientId is provided and user is BDE, verify client ownership
  if (data.clientId && session.role === "BDE") {
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { assignedBdeId: true },
    });
    if (!client || client.assignedBdeId !== session.userId) {
      throw new Error("Unauthorized: You do not own this client account.");
    }
  }

  // Strictly extract allowed safe fields only
  const safeData = {
    assetType: data.assetType || "CLIENT",
    name: data.name || data.businessName || data.clientName || "Untitled Asset",
    clientName: data.clientName || null,
    businessName: data.businessName || null,
    projectDescription: data.projectDescription || null,
    domainName: data.domainName || null,
    domainRegistrar: data.domainRegistrar || null,
    hostingProvider: data.hostingProvider || null,
    hostingIp: data.hostingIp || null,
    hostingUser: data.hostingUser || null,
    figmaLink: sanitizeUrl(data.figmaLink),
    githubRepo: sanitizeUrl(data.githubRepo),
    prompts: data.prompts || null,
    vaultRef: data.vaultRef || null,
    notes: data.notes || null,
    clientId: data.clientId || null,
  };

  try {
    const newAsset = await prisma.clientAsset.create({
      data: safeData,
      select: SAFE_ASSET_SELECT,
    });

    try {
      revalidatePath("/ceo/assets");
      revalidatePath("/dashboard/assets");
      if (data.clientId) {
        revalidatePath(`/dashboard/crm/${data.clientId}`);
      }
    } catch {}

    return { success: true, id: newAsset.id };
  } catch (error) {
    console.error("Failed to create client asset metadata:", error);
    throw new Error("Failed to create client asset");
  }
}

/**
 * Update an existing client asset record with IDOR protection & safe field enforcement.
 */
export async function updateClientAsset(id: string, data: any) {
  const session = await requireRole(["ADMIN", "BDE"]);

  const existing = await prisma.clientAsset.findUnique({
    where: { id },
    select: {
      id: true,
      assetType: true,
      clientId: true,
      client: { select: { assignedBdeId: true } },
    },
  });

  if (!existing) {
    throw new Error("Asset record not found");
  }

  if (
    session.role === "BDE" &&
    existing.assetType !== "AGENCY" &&
    existing.client?.assignedBdeId !== session.userId
  ) {
    throw new Error("Unauthorized access to asset record");
  }

  // Extract allowed safe fields only
  const safeData: any = {};
  if (data.assetType !== undefined) safeData.assetType = data.assetType;
  if (data.name !== undefined) safeData.name = data.name;
  if (data.clientName !== undefined) safeData.clientName = data.clientName;
  if (data.businessName !== undefined) safeData.businessName = data.businessName;
  if (data.projectDescription !== undefined) safeData.projectDescription = data.projectDescription;
  if (data.domainName !== undefined) safeData.domainName = data.domainName;
  if (data.domainRegistrar !== undefined) safeData.domainRegistrar = data.domainRegistrar;
  if (data.hostingProvider !== undefined) safeData.hostingProvider = data.hostingProvider;
  if (data.hostingIp !== undefined) safeData.hostingIp = data.hostingIp;
  if (data.hostingUser !== undefined) safeData.hostingUser = data.hostingUser;
  if (data.figmaLink !== undefined) safeData.figmaLink = sanitizeUrl(data.figmaLink);
  if (data.githubRepo !== undefined) safeData.githubRepo = sanitizeUrl(data.githubRepo);
  if (data.prompts !== undefined) safeData.prompts = data.prompts;
  if (data.vaultRef !== undefined) safeData.vaultRef = data.vaultRef;
  if (data.notes !== undefined) safeData.notes = data.notes;
  if (data.clientId !== undefined) safeData.clientId = data.clientId;

  try {
    await prisma.clientAsset.update({
      where: { id },
      data: safeData,
    });

    try {
      revalidatePath("/ceo/assets");
      revalidatePath("/dashboard/assets");
      if (existing.clientId) {
        revalidatePath(`/dashboard/crm/${existing.clientId}`);
      }
    } catch {}

    return { success: true };
  } catch (error) {
    console.error("Failed to update client asset:", error);
    throw new Error("Failed to update client asset");
  }
}

/**
 * Delete a client asset record with IDOR protection.
 */
export async function deleteClientAsset(id: string) {
  const session = await requireRole(["ADMIN", "BDE"]);

  const existing = await prisma.clientAsset.findUnique({
    where: { id },
    select: {
      id: true,
      assetType: true,
      clientId: true,
      client: { select: { assignedBdeId: true } },
    },
  });

  if (!existing) {
    throw new Error("Asset record not found");
  }

  if (
    session.role === "BDE" &&
    existing.assetType !== "AGENCY" &&
    existing.client?.assignedBdeId !== session.userId
  ) {
    throw new Error("Unauthorized access to asset record");
  }

  try {
    await prisma.clientAsset.delete({
      where: { id },
    });

    try {
      revalidatePath("/ceo/assets");
      revalidatePath("/dashboard/assets");
      if (existing.clientId) {
        revalidatePath(`/dashboard/crm/${existing.clientId}`);
      }
    } catch {}

    return { success: true };
  } catch (error) {
    console.error("Failed to delete client asset:", error);
    throw new Error("Failed to delete client asset");
  }
}
