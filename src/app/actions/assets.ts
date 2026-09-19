"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";

export async function initAssetsTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "client_assets" (
        "id" TEXT PRIMARY KEY,
        "assetType" TEXT DEFAULT 'CLIENT',
        "clientName" TEXT NOT NULL,
        "businessName" TEXT,
        "projectDescription" TEXT,
        "domainName" TEXT,
        "domainRegistrar" TEXT,
        "domainPassword" TEXT,
        "hostingProvider" TEXT,
        "hostingIp" TEXT,
        "hostingUser" TEXT,
        "hostingPassword" TEXT,
        "databaseUri" TEXT,
        "apiKeys" TEXT,
        "prompts" TEXT,
        "figmaLink" TEXT,
        "githubRepo" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `).catch(() => {});

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "client_assets" ADD COLUMN IF NOT EXISTS "assetType" TEXT DEFAULT 'CLIENT';
    `).catch(() => {});
  } catch (error) {
    console.error("Failed to init client_assets table:", error);
  }
}

export async function getClientAssets() {
  await requireRole(["ADMIN"]);
  try {
    await initAssetsTable();
    const assets = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "client_assets" ORDER BY "createdAt" DESC`
    );
    return assets;
  } catch (error) {
    console.error("Failed to fetch client assets:", error);
    return [];
  }
}

export async function createClientAsset(data: {
  assetType?: string;
  clientName: string;
  businessName?: string;
  projectDescription?: string;
  domainName?: string;
  domainRegistrar?: string;
  domainPassword?: string;
  hostingProvider?: string;
  hostingIp?: string;
  hostingUser?: string;
  hostingPassword?: string;
  databaseUri?: string;
  apiKeys?: string;
  prompts?: string;
  figmaLink?: string;
  githubRepo?: string;
  notes?: string;
}) {
  await requireRole(["ADMIN"]);
  try {
    await initAssetsTable();
    const id = `asset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const assetType = data.assetType || "CLIENT";

    await prisma.$executeRawUnsafe(
      `INSERT INTO "client_assets" (
        "id", "assetType", "clientName", "businessName", "projectDescription", "domainName", 
        "domainRegistrar", "domainPassword", "hostingProvider", "hostingIp", 
        "hostingUser", "hostingPassword", "databaseUri", "apiKeys", "prompts", 
        "figmaLink", "githubRepo", "notes"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      id,
      assetType,
      data.clientName,
      data.businessName || null,
      data.projectDescription || null,
      data.domainName || null,
      data.domainRegistrar || null,
      data.domainPassword || null,
      data.hostingProvider || null,
      data.hostingIp || null,
      data.hostingUser || null,
      data.hostingPassword || null,
      data.databaseUri || null,
      data.apiKeys || null,
      data.prompts || null,
      data.figmaLink || null,
      data.githubRepo || null,
      data.notes || null
    );

    try {
      revalidatePath("/ceo/assets");
      revalidatePath("/dashboard/assets");
    } catch {}
    return { success: true, id };
  } catch (error) {
    console.error("Failed to create client asset:", error);
    throw new Error("Failed to create client asset");
  }
}

export async function updateClientAsset(id: string, data: any) {
  await requireRole(["ADMIN"]);
  try {
    await initAssetsTable();
    const assetType = data.assetType || "CLIENT";
    await prisma.$executeRawUnsafe(
      `UPDATE "client_assets" SET 
        "assetType" = $1,
        "clientName" = $2,
        "businessName" = $3,
        "projectDescription" = $4,
        "domainName" = $5,
        "domainRegistrar" = $6,
        "domainPassword" = $7,
        "hostingProvider" = $8,
        "hostingIp" = $9,
        "hostingUser" = $10,
        "hostingPassword" = $11,
        "databaseUri" = $12,
        "apiKeys" = $13,
        "prompts" = $14,
        "figmaLink" = $15,
        "githubRepo" = $16,
        "notes" = $17,
        "updatedAt" = NOW()
      WHERE "id" = $18`,
      assetType,
      data.clientName,
      data.businessName || null,
      data.projectDescription || null,
      data.domainName || null,
      data.domainRegistrar || null,
      data.domainPassword || null,
      data.hostingProvider || null,
      data.hostingIp || null,
      data.hostingUser || null,
      data.hostingPassword || null,
      data.databaseUri || null,
      data.apiKeys || null,
      data.prompts || null,
      data.figmaLink || null,
      data.githubRepo || null,
      data.notes || null,
      id
    );

    try {
      revalidatePath("/ceo/assets");
      revalidatePath("/dashboard/assets");
    } catch {}
    return { success: true };
  } catch (error) {
    console.error("Failed to update client asset:", error);
    throw new Error("Failed to update client asset");
  }
}

export async function deleteClientAsset(id: string) {
  await requireRole(["ADMIN"]);
  try {
    await initAssetsTable();
    await prisma.$executeRawUnsafe(`DELETE FROM "client_assets" WHERE "id" = $1`, id);
    try {
      revalidatePath("/ceo/assets");
      revalidatePath("/dashboard/assets");
    } catch {}
    return { success: true };
  } catch (error) {
    console.error("Failed to delete client asset:", error);
    throw new Error("Failed to delete client asset");
  }
}

export async function deleteAllClientAssets() {
  await requireRole(["ADMIN"]);
  try {
    await initAssetsTable();
    await prisma.$executeRawUnsafe(`DELETE FROM "client_assets"`);
    try {
      revalidatePath("/ceo/assets");
      revalidatePath("/dashboard/assets");
    } catch {}
    return { success: true };
  } catch (error) {
    console.error("Failed to delete all client assets:", error);
    throw error;
  }
}
