-- AlterTable
ALTER TABLE "clients" ADD COLUMN "originLeadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clients_originLeadId_key" ON "clients"("originLeadId");

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_originLeadId_fkey" FOREIGN KEY ("originLeadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
