-- AlterTable
ALTER TABLE "users" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;
