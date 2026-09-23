/**
 * YOUISTIC BUSINESS OS — DEEP ASSURANCE TASK 050
 * QA Integration Test Script: Null, Zero, & Boundary Matrix Invariant Testing
 * Target DB: QA Database (youistic_os_test) loaded securely from .env.test
 */

import dotenv from 'dotenv';
import path from 'path';

// Load QA environment strictly from .env.test
dotenv.config({ path: path.resolve(process.cwd(), '.env.test') });

import { PrismaClient } from '@prisma/client';
import {
  isPositiveFiniteAmount,
  isNonNegativeFiniteAmount,
  isValidNonEmptyString,
  isValidServiceFamily,
  isValidRenewalFrequency,
} from '../lib/validation';

let testDbUrl = process.env.TEST_DATABASE_URL;
if (!testDbUrl) {
  console.error("FATAL: TEST_DATABASE_URL missing in .env.test");
  process.exit(1);
}

// Normalize connection parameters for Node Prisma driver on Windows
testDbUrl = testDbUrl.replace('&channel_binding=require', '').replace('?channel_binding=require', '?');
process.env.DATABASE_URL = testDbUrl;

const parsedUrl = new URL(testDbUrl);
if (parsedUrl.pathname.replace('/', '') !== 'youistic_os_test') {
  console.error(`FATAL: Refusing to run QA test against non-test DB: ${parsedUrl.pathname}`);
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: { db: { url: testDbUrl } },
});

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`QA ASSERTION FAILED: ${msg}`);
  }
}

async function runBoundaryMatrixTests() {
  console.log("=== DEEP ASSURANCE TASK 050: NULL, ZERO, & BOUNDARY MATRIX INVARIANT QA ===");
  console.log(`Target QA Host: ${parsedUrl.hostname}`);
  console.log(`Target QA DB: ${parsedUrl.pathname.replace('/', '')}`);

  // Test setup: Create temporary test client fixture
  const testClient = await prisma.client.create({
    data: {
      companyName: "QA Boundary Corp",
      contactPerson: "QA Tester",
      serviceType: "FBP",
      email: `boundary_qa_${Date.now()}@example.com`,
    }
  });

  console.log(`✔ Created temporary QA test client: ${testClient.id}`);

  try {
    // 1. Finance & Amount Boundary Invariants
    console.log("--- 1. Finance Amount Boundary Invariants ---");
    const validAmount = 5000;
    const zeroAmount = 0;
    const negativeAmount = -100;
    const nanAmount = NaN;
    const infinityAmount = Infinity;

    assert(isPositiveFiniteAmount(validAmount) === true, "Positive amount 5000 must pass validation");
    assert(isPositiveFiniteAmount(zeroAmount) === false, "Zero amount must fail positive amount check");
    assert(isPositiveFiniteAmount(negativeAmount) === false, "Negative amount must fail validation");
    assert(isPositiveFiniteAmount(nanAmount) === false, "NaN amount must fail validation");
    assert(isPositiveFiniteAmount(infinityAmount) === false, "Infinity amount must fail validation");

    assert(isNonNegativeFiniteAmount(zeroAmount) === true, "Zero amount must pass non-negative check");
    assert(isNonNegativeFiniteAmount(validAmount) === true, "Positive amount must pass non-negative check");
    assert(isNonNegativeFiniteAmount(negativeAmount) === false, "Negative amount must fail non-negative check");

    // 2. Date Boundary & Nullability Matrix
    console.log("--- 2. Date Boundary & Nullability Matrix ---");
    const now = new Date();
    const farFuture = new Date("2099-12-31T23:59:59.999Z");
    const epochStart = new Date("1970-01-01T00:00:00.000Z");

    const offeringFixture = await prisma.serviceOffering.create({
      data: {
        name: "QA Web Development Offering",
        family: "MEGA_WEB",
        code: `QA_WEB_${Date.now()}`,
      }
    });

    const serviceFixture = await prisma.clientService.create({
      data: {
        client: { connect: { id: testClient.id } },
        offering: { connect: { id: offeringFixture.id } },
        commercialValue: 25000,
        status: "ACTIVE",
        renewalFrequency: "ANNUAL",
        startDate: now,
        nextRenewalDate: farFuture,
      }
    });
    assert(serviceFixture.nextRenewalDate?.getUTCFullYear() === 2099, "Far future renewal date must be correctly stored");

    // Update with null renewal date (for frequency NONE)
    const updatedService = await prisma.clientService.update({
      where: { id: serviceFixture.id },
      data: {
        renewalFrequency: "NONE",
        nextRenewalDate: null,
      }
    });
    assert(updatedService.nextRenewalDate === null, "Null nextRenewalDate must be correctly persisted");

    // 3. FBP Content Item Boundary Tests
    console.log("--- 3. FBP Content Item Boundary Invariants ---");
    const fbpFixture = await prisma.fbpContentItem.create({
      data: {
        client: { connect: { id: testClient.id } },
        title: "QA FBP Post Title",
        platform: "LINKEDIN",
        stage: "IDEA",
        scheduledDate: epochStart,
      }
    });
    assert(fbpFixture.title === "QA FBP Post Title", "FBP item title must match input");
    assert(fbpFixture.scheduledDate?.getUTCFullYear() === 1970, "Epoch start date must be correctly stored");

    // 4. String Boundary & Sanitization Checks
    console.log("--- 4. String Boundary & Validation Matrix ---");
    assert(isValidNonEmptyString("A") === true, "Single character string must be valid");
    assert(isValidNonEmptyString("   ") === false, "Whitespace-only string must fail");
    assert(isValidNonEmptyString("") === false, "Empty string must fail");
    assert(isValidNonEmptyString(null) === false, "Null input must fail");
    assert(isValidNonEmptyString(undefined) === false, "Undefined input must fail");

    console.log("✔ ALL NULL, ZERO, & BOUNDARY MATRIX INVARIANTS VERIFIED SUCCESSFULLY");

  } finally {
    // Clean up temporary fixtures
    console.log("--- Cleaning up temporary QA fixtures ---");
    await prisma.fbpContentItem.deleteMany({ where: { clientId: testClient.id } });
    await prisma.clientService.deleteMany({ where: { clientId: testClient.id } });
    await prisma.client.delete({ where: { id: testClient.id } });
    await prisma.serviceOffering.deleteMany({ where: { name: "QA Web Development Offering" } });
    console.log("✔ Temporary QA test fixtures purged cleanly.");
  }
}

runBoundaryMatrixTests()
  .then(async () => {
    await prisma.$disconnect();
    console.log("=== DEEP ASSURANCE TASK 050 QA INTEGRATION TEST SUITE: PASS ===");
    process.exit(0);
  })
  .catch(async (err) => {
    console.error("QA TEST FAILED:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
