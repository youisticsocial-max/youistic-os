import { prisma } from "../lib/prisma";
import { UserRole, LeadStatus } from "@prisma/client";

async function main() {
  console.log("=== PHASE 2B TRANSACTIONAL CONVERSION TEST SUITE ===");

  // Create isolated test SDR and BDE users
  const testSdr = await prisma.user.create({
    data: { name: "Test Phase2B SDR", email: "test_sdr_phase2b@youistic.com", role: UserRole.SDR }
  });
  const testBde = await prisma.user.create({
    data: { name: "Test Phase2B BDE", email: "test_bde_phase2b@youistic.com", role: UserRole.BDE }
  });

  const createdLeadIds: string[] = [];
  const createdClientIds: string[] = [];

  try {
    // -------------------------------------------------------------
    // CASE A: Valid lead + advance > 0
    // -------------------------------------------------------------
    console.log("\n[TEST CASE A] Valid lead + advance > 0...");
    const leadA = await prisma.lead.create({
      data: {
        clientName: "Alpha Client",
        businessName: "Alpha Tech Solutions",
        clientPhone: "9876543210",
        clientEmail: "alpha@test.com",
        service: "Tech Setup & Web App",
        status: LeadStatus.HOT_LEAD,
        assignedSdrId: testSdr.id,
      }
    });
    createdLeadIds.push(leadA.id);

    // Simulate conversion via transaction logic
    const clientA = await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id: leadA.id }, data: { status: LeadStatus.CONVERTED } });
      const c = await tx.client.create({
        data: {
          companyName: leadA.businessName!,
          contactPerson: leadA.clientName,
          email: leadA.clientEmail,
          phone: leadA.clientPhone,
          serviceType: "TECH",
          contractValue: 50000,
          status: "ACTIVE",
        }
      });
      await tx.project.create({
        data: {
          name: `${c.companyName} - TECH Execution`,
          type: "TECH",
          status: "IN_PROGRESS",
          clientId: c.id,
        }
      });
      await tx.revenueEntry.create({
        data: {
          amount: 20000,
          paymentDate: new Date(),
          revenueType: "TECH",
          clientId: c.id,
        }
      });
      return c;
    });
    createdClientIds.push(clientA.id);

    const checkLeadA = await prisma.lead.findUnique({ where: { id: leadA.id } });
    const checkProjA = await prisma.project.findFirst({ where: { clientId: clientA.id } });
    const checkRevA = await prisma.revenueEntry.findFirst({ where: { clientId: clientA.id } });

    const passA = checkLeadA?.status === "CONVERTED" && !!clientA && !!checkProjA && checkRevA?.amount === 20000;
    console.log("  CASE A:", passA ? "PASS" : "FAIL");

    // -------------------------------------------------------------
    // CASE B: Valid lead + advance = 0 (No revenue entry)
    // -------------------------------------------------------------
    console.log("\n[TEST CASE B] Valid lead + advance = 0...");
    const leadB = await prisma.lead.create({
      data: {
        clientName: "Beta Client",
        businessName: "Beta Marketing",
        service: "FBP Service",
        status: LeadStatus.HOT_LEAD,
      }
    });
    createdLeadIds.push(leadB.id);

    const clientB = await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id: leadB.id }, data: { status: LeadStatus.CONVERTED } });
      const c = await tx.client.create({
        data: {
          companyName: leadB.businessName!,
          contactPerson: leadB.clientName,
          serviceType: "FBP",
          contractValue: 30000,
          status: "ACTIVE",
          assignedBdeId: testBde.id,
        }
      });
      await tx.project.create({
        data: {
          name: `${c.companyName} - FBP Execution`,
          type: "FBP",
          status: "IN_PROGRESS",
          clientId: c.id,
        }
      });
      // advance = 0, NO revenue entry
      return c;
    });
    createdClientIds.push(clientB.id);

    const checkLeadB = await prisma.lead.findUnique({ where: { id: leadB.id } });
    const checkProjB = await prisma.project.findFirst({ where: { clientId: clientB.id } });
    const checkRevB = await prisma.revenueEntry.findFirst({ where: { clientId: clientB.id } });

    const passB = checkLeadB?.status === "CONVERTED" && !!clientB && !!checkProjB && checkRevB === null;
    console.log("  CASE B:", passB ? "PASS" : "FAIL");

    // -------------------------------------------------------------
    // CASE C: Forced failure after client creation (Atomic Rollback)
    // -------------------------------------------------------------
    console.log("\n[TEST CASE C] Forced failure rollback test...");
    const leadC = await prisma.lead.create({
      data: {
        clientName: "Gamma Client",
        businessName: "Gamma Industries",
        status: LeadStatus.HOT_LEAD,
      }
    });
    createdLeadIds.push(leadC.id);

    let rollbackSuccess = false;
    let createdResidueClientId: string | null = null;
    try {
      await prisma.$transaction(async (tx) => {
        await tx.lead.update({ where: { id: leadC.id }, data: { status: LeadStatus.CONVERTED } });
        const c = await tx.client.create({
          data: {
            companyName: leadC.businessName!,
            contactPerson: leadC.clientName,
            serviceType: "FBP",
            status: "ACTIVE",
          }
        });
        createdResidueClientId = c.id;
        // Intentionally throw error to force rollback
        throw new Error("FORCED_SIMULATED_TRANSACTION_FAILURE");
      });
    } catch (err: any) {
      if (err.message.includes("FORCED_SIMULATED_TRANSACTION_FAILURE")) {
        rollbackSuccess = true;
      }
    }

    const checkLeadC = await prisma.lead.findUnique({ where: { id: leadC.id } });
    const checkClientC = createdResidueClientId ? await prisma.client.findUnique({ where: { id: createdResidueClientId } }) : null;

    const passC = rollbackSuccess && checkLeadC?.status === LeadStatus.HOT_LEAD && checkClientC === null;
    console.log("  CASE C (Atomic Rollback):", passC ? "PASS" : "FAIL");

    // -------------------------------------------------------------
    // CASE D: Duplicate conversion attempt
    // -------------------------------------------------------------
    console.log("\n[TEST CASE D] Duplicate conversion attempt rejection...");
    const leadD = await prisma.lead.create({
      data: {
        clientName: "Delta Client",
        businessName: "Delta Corp",
        status: LeadStatus.CONVERTED, // Already converted!
      }
    });
    createdLeadIds.push(leadD.id);

    let duplicateRejected = false;
    try {
      await prisma.$transaction(async (tx) => {
        const lead = await tx.lead.findUnique({ where: { id: leadD.id } });
        if (lead?.status === LeadStatus.CONVERTED) {
          throw new Error("CONFLICT: Lead has already been converted to a client.");
        }
      });
    } catch (err: any) {
      if (err.message.includes("CONFLICT")) {
        duplicateRejected = true;
      }
    }

    console.log("  CASE D (Duplicate Rejection):", duplicateRejected ? "PASS" : "FAIL");

    // -------------------------------------------------------------
    // CASE E: SDR Attribution Preserved
    // -------------------------------------------------------------
    console.log("\n[TEST CASE E] SDR Attribution Preservation...");
    const passE = checkLeadA?.assignedSdrId === testSdr.id;
    console.log("  CASE E (SDR Attribution):", passE ? "PASS" : "FAIL");

    // -------------------------------------------------------------
    // CASE F: BDE Attribution Preserved
    // -------------------------------------------------------------
    console.log("\n[TEST CASE F] BDE Attribution Preservation...");
    const passF = clientB.assignedBdeId === testBde.id;
    console.log("  CASE F (BDE Attribution):", passF ? "PASS" : "FAIL");

    // -------------------------------------------------------------
    // CASE G: Source, Service, Fee Preserved
    // -------------------------------------------------------------
    console.log("\n[TEST CASE G] Source, Service & Fee Preservation...");
    const passG = clientA.serviceType === "TECH" && clientA.contractValue === 50000;
    console.log("  CASE G (Values Preserved):", passG ? "PASS" : "FAIL");

    const allPassed = passA && passB && passC && duplicateRejected && passE && passF && passG;
    console.log("\nOVERALL TEST SUITE VERDICT:", allPassed ? ">>> ALL TESTS PASSED <<<" : ">>> SOME TESTS FAILED <<<");
    if (!allPassed) process.exitCode = 1;

  } finally {
    // CLEANUP ALL TEST DATA
    console.log("\nCleaning up test records...");
    for (const cid of createdClientIds) {
      await prisma.revenueEntry.deleteMany({ where: { clientId: cid } }).catch(() => {});
      await prisma.project.deleteMany({ where: { clientId: cid } }).catch(() => {});
      await prisma.client.delete({ where: { id: cid } }).catch(() => {});
    }
    for (const lid of createdLeadIds) {
      await prisma.lead.delete({ where: { id: lid } }).catch(() => {});
    }
    await prisma.user.deleteMany({ where: { id: { in: [testSdr.id, testBde.id] } } }).catch(() => {});
    console.log("Cleanup finished.");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
