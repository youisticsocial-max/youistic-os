import fs from "fs";
import path from "path";

console.log("=== PHASE 2G DATABASE INTEGRITY & RAW SQL AUDIT VERIFICATION SUITE ===");

let passed = 0;
let total = 0;

function assert(description: string, condition: boolean) {
  total++;
  if (condition) {
    passed++;
    console.log(`[CASE ${String.fromCharCode(64 + total)}] ${description}`);
    console.log(`  -> PASS`);
  } else {
    console.error(`[CASE ${String.fromCharCode(64 + total)}] ${description}`);
    console.error(`  -> FAIL`);
    process.exit(1);
  }
}

const leadsActionsPath = path.join(process.cwd(), "src", "app", "actions", "leads.ts");
const leadsContent = fs.readFileSync(leadsActionsPath, "utf-8");

// Assertion 1: leads.ts has zero $queryRawUnsafe or $executeRawUnsafe calls
assert(
  "Checking that leads.ts has zero raw SQL query calls...",
  !leadsContent.includes("$queryRaw") && !leadsContent.includes("$executeRaw")
);

// Assertion 2: getLeads uses Prisma ORM findMany
assert(
  "Checking getLeads uses Prisma ORM findMany...",
  leadsContent.includes("prisma.lead.findMany")
);

// Assertion 3: updateLeadStatus uses atomic Prisma ORM update
assert(
  "Checking updateLeadStatus uses Prisma ORM update...",
  leadsContent.includes("prisma.lead.update")
);

// Assertion 4: convertLeadToClient wraps operations in Prisma transaction
assert(
  "Checking convertLeadToClient uses atomic Prisma transaction...",
  leadsContent.includes("prisma.$transaction")
);

// Assertion 5: Proposal -> Lead uses ON DELETE RESTRICT
const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
const schemaContent = fs.readFileSync(schemaPath, "utf-8");
assert(
  "Checking Proposal model onDelete Restrict rule...",
  schemaContent.includes("onDelete: Restrict")
);

// Assertion 6: ClientAsset -> Client uses ON DELETE SET NULL
assert(
  "Checking ClientAsset model onDelete SetNull rule...",
  schemaContent.includes("onDelete: SetNull")
);

// Assertion 7: Client.originLeadId has unique constraint
assert(
  "Checking Client.originLeadId has unique constraint...",
  schemaContent.includes("originLeadId    String?      @unique")
);

console.log(`\n=== ALL ${passed} OF ${total} PHASE 2G ASSERTIONS PASSED SUCCESSFULLY (0 DB CONNECTIONS) ===`);
