-- AlterTable
ALTER TABLE "client_assets" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE "client_assets" ADD COLUMN IF NOT EXISTS "vaultRef" TEXT;
ALTER TABLE "client_assets" ADD COLUMN IF NOT EXISTS "clientId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "client_assets_clientId_idx" ON "client_assets"("clientId");
CREATE INDEX IF NOT EXISTS "client_assets_assetType_idx" ON "client_assets"("assetType");
CREATE INDEX IF NOT EXISTS "client_assets_createdAt_idx" ON "client_assets"("createdAt");

-- AddForeignKey
ALTER TABLE "client_assets" ADD CONSTRAINT "client_assets_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
