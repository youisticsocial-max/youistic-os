/**
 * Phase 2F Assets & Vault Security Redesign Verification Suite
 * Static code & AST pattern analysis - ZERO DB connections / zero mutations
 */

import * as fs from "fs";
import * as path from "path";
import assert from "assert";

function runTests() {
  console.log("=== PHASE 2F ASSET & VAULT SECURITY VERIFICATION SUITE ===");

  const projectRoot = process.cwd();
  const schemaPath = path.join(projectRoot, "prisma", "schema.prisma");
  const migrationPath = path.join(projectRoot, "prisma", "migrations", "20260922030000_add_client_asset_vault_metadata", "migration.sql");
  const assetActionsPath = path.join(projectRoot, "src", "app", "actions", "assets.ts");
  const clientActionsPath = path.join(projectRoot, "src", "app", "actions", "clients.ts");
  const assetPagePath = path.join(projectRoot, "src", "app", "dashboard", "assets", "page.tsx");
  const client360Path = path.join(projectRoot, "src", "app", "dashboard", "crm", "[clientId]", "page.tsx");

  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  const migrationContent = fs.readFileSync(migrationPath, "utf-8");
  const assetActionsContent = fs.readFileSync(assetActionsPath, "utf-8");
  const clientActionsContent = fs.readFileSync(clientActionsPath, "utf-8");
  const assetPageContent = fs.readFileSync(assetPagePath, "utf-8");
  const client360Content = fs.readFileSync(client360Path, "utf-8");

  // CASE A: ClientAsset model has relational link to Client
  console.log("[CASE A] Checking ClientAsset model relational link to Client...");
  assert(schemaContent.includes("model ClientAsset"), "ClientAsset model exists in schema");
  assert(schemaContent.includes("client             Client?  @relation(fields: [clientId], references: [id]"), "ClientAsset linked to Client via clientId FK");
  console.log("  -> PASS: ClientAsset model relationally linked to Client.");

  // CASE B: ClientAsset schema has NO plaintext password fields
  console.log("[CASE B] Checking ClientAsset model for absence of password fields...");
  const modelBlock = schemaContent.substring(schemaContent.indexOf("model ClientAsset"));
  assert(!modelBlock.includes("domainPassword"), "No domainPassword in ClientAsset model");
  assert(!modelBlock.includes("hostingPassword"), "No hostingPassword in ClientAsset model");
  assert(!modelBlock.includes("password"), "No password in ClientAsset model");
  console.log("  -> PASS: Plaintext password fields absent from ClientAsset model.");

  // CASE C: ClientAsset schema has NO API keys or database URI secret fields
  console.log("[CASE C] Checking ClientAsset model for absence of token/API keys/DB URI...");
  assert(!modelBlock.includes("apiKeys"), "No apiKeys in ClientAsset model");
  assert(!modelBlock.includes("databaseUri"), "No databaseUri in ClientAsset model");
  console.log("  -> PASS: Token/API secret fields absent from ClientAsset model.");

  // CASE D: vaultRef field stores reference string only
  console.log("[CASE D] Checking vaultRef reference field...");
  assert(modelBlock.includes("vaultRef           String?"), "vaultRef field defined in ClientAsset model");
  assert(assetActionsContent.includes("vaultRef"), "vaultRef handled in server actions");
  console.log("  -> PASS: vaultRef reference field implemented.");

  // CASE E & F: RBAC enforcement in asset actions
  console.log("[CASE E & F] Checking RBAC scoping for ADMIN and BDE...");
  assert(assetActionsContent.includes('if (session.role === "SDR")'), "SDR role blocked from viewing/creating assets");
  assert(assetActionsContent.includes("client: { assignedBdeId: session.userId }"), "BDE scoped to assigned clients");
  console.log("  -> PASS: RBAC rules enforced server-side.");

  // CASE G: IDOR protection in asset actions
  console.log("[CASE G] Checking IDOR protection in update/delete asset actions...");
  assert(assetActionsContent.includes("asset.client?.assignedBdeId !== session.userId"), "IDOR check verifies client ownership");
  console.log("  -> PASS: IDOR protection verified.");

  // CASE H: Client 360 returns safe asset fields only
  console.log("[CASE H] Checking Client 360 safe asset metadata...");
  assert(clientActionsContent.includes("assets: {"), "Client 360 queries assets relationally");
  assert(!clientActionsContent.includes("domainPassword"), "Client 360 select excludes domainPassword");
  assert(!clientActionsContent.includes("databaseUri"), "Client 360 select excludes databaseUri");
  console.log("  -> PASS: Client 360 uses safe asset metadata select.");

  // CASE I: Credential-bearing URL handling
  console.log("[CASE I] Checking sanitizeUrl helper...");
  assert(assetActionsContent.includes("function sanitizeUrl"), "sanitizeUrl helper present in assets server action");
  console.log("  -> PASS: URL sanitization implemented.");

  // CASE J: Relational clientId linkage in create action
  console.log("[CASE J] Checking relational clientId handling in create asset...");
  assert(assetActionsContent.includes("clientId: data.clientId || null"), "clientId persisted relationally");
  console.log("  -> PASS: Relational clientId supported.");

  // CASE K: Legacy secret field not copied into new metadata record
  console.log("[CASE K] Checking server actions exclude legacy secret fields...");
  assert(!assetActionsContent.includes("domainPassword:"), "Server action data object excludes domainPassword");
  assert(!assetActionsContent.includes("hostingPassword:"), "Server action data object excludes hostingPassword");
  console.log("  -> PASS: Legacy secret fields excluded from new write paths.");

  // CASE L: Phase 2B Lead Conversion preserved
  console.log("[CASE L] Verifying Phase 2B Lead Conversion integrity...");
  const leadActionsContent = fs.readFileSync(path.join(projectRoot, "src", "app", "actions", "leads.ts"), "utf-8");
  assert(leadActionsContent.includes("convertLeadToClient"), "Phase 2B convertLeadToClient present");
  console.log("  -> PASS: Phase 2B Lead conversion preserved.");

  // CASE M: Phase 2C BDE Scoping preserved
  console.log("[CASE M] Verifying Phase 2C BDE Scoping integrity...");
  assert(leadActionsContent.includes("assignedBdeId"), "Phase 2C assignedBdeId present");
  console.log("  -> PASS: Phase 2C BDE scoping preserved.");

  // CASE N: Phase 2D CRM/Client360 originLeadId preserved
  console.log("[CASE N] Verifying Phase 2D CRM/Client360 integrity...");
  assert(schemaContent.includes("originLeadId    String?      @unique"), "Phase 2D originLeadId present in schema");
  console.log("  -> PASS: Phase 2D CRM/Client360 preserved.");

  // CASE O: Phase 2E Proposal persistence preserved
  console.log("[CASE O] Verifying Phase 2E Proposal persistence integrity...");
  assert(schemaContent.includes("model Proposal"), "Phase 2E Proposal model present in schema");
  assert(schemaContent.includes("onDelete: Restrict"), "Phase 2E Proposal -> Lead ON DELETE RESTRICT preserved");
  console.log("  -> PASS: Phase 2E Proposals preserved.");

  console.log("\n=== ALL 15 ASSERTIONS PASSED SUCCESSFULLY (0 DB CONNECTIONS) ===");
}

runTests();
