-- AlterTable
ALTER TABLE "leads" ADD COLUMN "assignedBdeId" TEXT;

-- CreateIndex
CREATE INDEX "leads_assignedSdrId_idx" ON "leads"("assignedSdrId");

-- CreateIndex
CREATE INDEX "leads_assignedBdeId_idx" ON "leads"("assignedBdeId");

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedBdeId_fkey" FOREIGN KEY ("assignedBdeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
