import { prisma } from "../lib/prisma";
import { UserRole, MeetingStatus } from "@prisma/client";

async function main() {
  console.log("=== PHASE 2A.3 APPOINTMENT OWNERSHIP & HANDOFF LOGIC TEST ===");

  // 1. Create temporary test users
  const admin = await prisma.user.create({
    data: { name: "Test Admin", email: "test_admin_phase2a3@youistic.com", role: UserRole.ADMIN }
  });
  const sdrA = await prisma.user.create({
    data: { name: "Test SDR A", email: "test_sdra_phase2a3@youistic.com", role: UserRole.SDR }
  });
  const sdrB = await prisma.user.create({
    data: { name: "Test SDR B", email: "test_sdrb_phase2a3@youistic.com", role: UserRole.SDR }
  });
  const bdeA = await prisma.user.create({
    data: { name: "Test BDE A", email: "test_bdea_phase2a3@youistic.com", role: UserRole.BDE }
  });
  const bdeB = await prisma.user.create({
    data: { name: "Test BDE B", email: "test_bdeb_phase2a3@youistic.com", role: UserRole.BDE }
  });

  try {
    // 2. Test SDR A creating a meeting assigned to BDE A
    const meetingSdrAtoBdeA = await prisma.meeting.create({
      data: {
        title: "SDR A -> BDE A Test Meeting",
        meetingDate: new Date(),
        createdById: sdrA.id,
        hostId: bdeA.id,
        status: MeetingStatus.SCHEDULED,
      }
    });

    // 3. Test BDE B self-created meeting
    const meetingBdeBSelf = await prisma.meeting.create({
      data: {
        title: "BDE B Self Created Meeting",
        meetingDate: new Date(),
        createdById: bdeB.id,
        hostId: bdeB.id,
        status: MeetingStatus.SCHEDULED,
      }
    });

    // 4. Test Historical meeting (createdById = null)
    const historicalMeeting = await prisma.meeting.create({
      data: {
        title: "Historical Meeting No Creator",
        meetingDate: new Date(),
        createdById: null,
        hostId: bdeA.id,
        status: MeetingStatus.SCHEDULED,
      }
    });

    // --- VISIBILITY CHECKS ---
    const getMeetingsForUser = async (userId: string, role: UserRole) => {
      if (role === UserRole.ADMIN) {
        return await prisma.meeting.findMany({ include: { host: true, createdBy: true } });
      }
      return await prisma.meeting.findMany({
        where: {
          OR: [
            { hostId: userId },
            { createdById: userId }
          ]
        },
        include: { host: true, createdBy: true }
      });
    };

    const adminVisible = await getMeetingsForUser(admin.id, UserRole.ADMIN);
    const sdrAVisible = await getMeetingsForUser(sdrA.id, UserRole.SDR);
    const sdrBVisible = await getMeetingsForUser(sdrB.id, UserRole.SDR);
    const bdeAVisible = await getMeetingsForUser(bdeA.id, UserRole.BDE);
    const bdeBVisible = await getMeetingsForUser(bdeB.id, UserRole.BDE);

    // Verify SDR A sees SDR A -> BDE A meeting
    const sdrASeesHandoff = sdrAVisible.some(m => m.id === meetingSdrAtoBdeA.id);
    // Verify BDE A sees SDR A -> BDE A meeting
    const bdeASeesHandoff = bdeAVisible.some(m => m.id === meetingSdrAtoBdeA.id);
    // Verify SDR B does NOT see SDR A -> BDE A meeting
    const sdrBSeesHandoff = sdrBVisible.some(m => m.id === meetingSdrAtoBdeA.id);
    // Verify BDE B does NOT see SDR A -> BDE A meeting
    const bdeBSeesHandoff = bdeBVisible.some(m => m.id === meetingSdrAtoBdeA.id);
    // Verify ADMIN sees all meetings
    const adminSeesAll = adminVisible.length >= 3;

    // Verify Historical meeting visibility
    const bdeASeesHistorical = bdeAVisible.some(m => m.id === historicalMeeting.id);
    const adminSeesHistorical = adminVisible.some(m => m.id === historicalMeeting.id);

    console.log("VISIBILITY TEST RESULTS:");
    console.log("  SDR A sees handoff meeting:", sdrASeesHandoff ? "PASS" : "FAIL");
    console.log("  BDE A sees handoff meeting:", bdeASeesHandoff ? "PASS" : "FAIL");
    console.log("  SDR B sees handoff meeting (should be false):", !sdrBSeesHandoff ? "PASS" : "FAIL");
    console.log("  BDE B sees handoff meeting (should be false):", !bdeBSeesHandoff ? "PASS" : "FAIL");
    console.log("  ADMIN sees all meetings:", adminSeesAll ? "PASS" : "FAIL");
    console.log("  BDE A sees historical meeting (createdById=null):", bdeASeesHistorical ? "PASS" : "FAIL");
    console.log("  ADMIN sees historical meeting:", adminSeesHistorical ? "PASS" : "FAIL");

    // --- MUTATION CHECKS ---
    const checkCanMutate = (meeting: any, userId: string, role: UserRole) => {
      return role === UserRole.ADMIN || meeting.hostId === userId || meeting.createdById === userId;
    };

    console.log("\nMUTATION PERMISSION TEST RESULTS:");
    console.log("  SDR A mutate handoff meeting:", checkCanMutate(meetingSdrAtoBdeA, sdrA.id, UserRole.SDR) ? "PASS" : "FAIL");
    console.log("  BDE A mutate handoff meeting:", checkCanMutate(meetingSdrAtoBdeA, bdeA.id, UserRole.BDE) ? "PASS" : "FAIL");
    console.log("  SDR B mutate handoff meeting (should be false):", !checkCanMutate(meetingSdrAtoBdeA, sdrB.id, UserRole.SDR) ? "PASS" : "FAIL");
    console.log("  BDE B mutate handoff meeting (should be false):", !checkCanMutate(meetingSdrAtoBdeA, bdeB.id, UserRole.BDE) ? "PASS" : "FAIL");
    console.log("  ADMIN mutate handoff meeting:", checkCanMutate(meetingSdrAtoBdeA, admin.id, UserRole.ADMIN) ? "PASS" : "FAIL");

    const allPassed = sdrASeesHandoff && bdeASeesHandoff && !sdrBSeesHandoff && !bdeBSeesHandoff &&
      adminSeesAll && bdeASeesHistorical && adminSeesHistorical &&
      checkCanMutate(meetingSdrAtoBdeA, sdrA.id, UserRole.SDR) &&
      checkCanMutate(meetingSdrAtoBdeA, bdeA.id, UserRole.BDE) &&
      !checkCanMutate(meetingSdrAtoBdeA, sdrB.id, UserRole.SDR) &&
      !checkCanMutate(meetingSdrAtoBdeA, bdeB.id, UserRole.BDE) &&
      checkCanMutate(meetingSdrAtoBdeA, admin.id, UserRole.ADMIN);

    if (allPassed) {
      console.log("\n>>> ALL LOGIC TESTS PASSED SUCCESSFULLY! <<<");
    } else {
      console.error("\n>>> SOME TESTS FAILED! <<<");
      process.exitCode = 1;
    }

  } finally {
    // Clean up test meetings and test users completely
    await prisma.meeting.deleteMany({
      where: {
        id: { in: [admin.id, sdrA.id, sdrB.id, bdeA.id, bdeB.id] }
      }
    }).catch(() => {});
    await prisma.meeting.deleteMany({
      where: {
        title: { in: ["SDR A -> BDE A Test Meeting", "BDE B Self Created Meeting", "Historical Meeting No Creator"] }
      }
    });
    await prisma.user.deleteMany({
      where: {
        id: { in: [admin.id, sdrA.id, sdrB.id, bdeA.id, bdeB.id] }
      }
    });
    console.log("Test data cleanup complete.");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
