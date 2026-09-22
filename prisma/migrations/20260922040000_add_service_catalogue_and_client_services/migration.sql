-- CreateEnum
CREATE TYPE "ServiceFamily" AS ENUM ('MEGA_SOFT', 'MEGA_WEB', 'MEGA_APPS', 'FBP');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RenewalFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'ANNUAL', 'CUSTOM', 'NONE');

-- CreateTable
CREATE TABLE "service_offerings" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "family" "ServiceFamily" NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_offerings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_services" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "status" "ServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3),
    "commercialValue" DOUBLE PRECISION DEFAULT 0,
    "renewalAmount" DOUBLE PRECISION DEFAULT 0,
    "renewalFrequency" "RenewalFrequency" NOT NULL DEFAULT 'ANNUAL',
    "nextRenewalDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_offerings_code_key" ON "service_offerings"("code");

-- CreateIndex
CREATE INDEX "service_offerings_family_idx" ON "service_offerings"("family");

-- CreateIndex
CREATE INDEX "service_offerings_isActive_idx" ON "service_offerings"("isActive");

-- CreateIndex
CREATE INDEX "client_services_clientId_idx" ON "client_services"("clientId");

-- CreateIndex
CREATE INDEX "client_services_offeringId_idx" ON "client_services"("offeringId");

-- CreateIndex
CREATE INDEX "client_services_status_idx" ON "client_services"("status");

-- CreateIndex
CREATE INDEX "client_services_nextRenewalDate_idx" ON "client_services"("nextRenewalDate");

-- AddForeignKey
ALTER TABLE "client_services" ADD CONSTRAINT "client_services_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_services" ADD CONSTRAINT "client_services_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "service_offerings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
