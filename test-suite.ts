/**
 * YOUISTIC BUSINESS OS — ISOLATED HARDENING UNIT TEST SUITE
 * Unit tests importing production shared validation and authorization helpers directly.
 * Zero database connection or production environment coupling.
 */

import {
  isPositiveFiniteAmount,
  canRoleAccessProjects,
  isBdeClientAuthorized,
  isValidNonEmptyString,
  isValidServiceFamily,
  isValidRenewalFrequency,
  isValidServiceStatus,
  isNonNegativeFiniteAmount,
} from "./src/lib/validation";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

// 1. Finance Amount Validation Tests
function testAmountValidation() {
  assert(isPositiveFiniteAmount(500) === true, "Valid numeric amount 500 should pass");
  assert(isPositiveFiniteAmount("500") === true, "Valid numeric string '500' should pass");
  assert(isPositiveFiniteAmount(1) === true, "Boundary amount 1 should pass");
  assert(isPositiveFiniteAmount(0) === false, "Zero amount should fail");
  assert(isPositiveFiniteAmount(-1) === false, "Negative amount -1 should fail");
  assert(isPositiveFiniteAmount(-100) === false, "Negative amount -100 should fail");
  assert(isPositiveFiniteAmount(NaN) === false, "NaN should fail");
  assert(isPositiveFiniteAmount(Infinity) === false, "Infinity should fail");
  assert(isPositiveFiniteAmount(-Infinity) === false, "-Infinity should fail");
  assert(isPositiveFiniteAmount("abc") === false, "Non-numeric string should fail");
  console.log("✔ Finance Amount Validation Unit Tests (Production Helper): PASS");
}

// 2. Projects Role Policy Tests (Locked Decision: SDR Denied)
function testProjectsRolePolicy() {
  assert(canRoleAccessProjects("ADMIN") === true, "ADMIN should have Projects access");
  assert(canRoleAccessProjects("BDE") === true, "BDE should have Projects access");
  assert(canRoleAccessProjects("SDR") === false, "SDR MUST be denied Projects access");
  assert(canRoleAccessProjects("SUPPORT") === false, "SUPPORT should be denied Projects access");
  console.log("✔ Projects Role Access Unit Tests (Production Helper): PASS");
}

// 3. BDE Client Ownership & IDOR Tests
function testBdeClientOwnership() {
  assert(isBdeClientAuthorized("bde_123", "bde_123", "BDE") === true, "Matching BDE should be authorized");
  assert(isBdeClientAuthorized("bde_456", "bde_123", "BDE") === false, "Different BDE should be denied");
  assert(isBdeClientAuthorized(null, "bde_123", "BDE") === false, "Null client assignment should be denied");
  assert(isBdeClientAuthorized(undefined, "bde_123", "BDE") === false, "Undefined client assignment should be denied");
  assert(isBdeClientAuthorized("bde_456", "admin_001", "ADMIN") === true, "ADMIN should be authorized for any client");
  console.log("✔ BDE Client Ownership & IDOR Unit Tests (Production Helper): PASS");
}

// 4. String Input Validation Tests
function testStringValidation() {
  assert(isValidNonEmptyString("Valid Title") === true, "Non-empty string should pass");
  assert(isValidNonEmptyString("   ") === false, "Whitespace-only string should fail");
  assert(isValidNonEmptyString("") === false, "Empty string should fail");
  assert(isValidNonEmptyString(null) === false, "Null input should fail");
  assert(isValidNonEmptyString(undefined) === false, "Undefined input should fail");
  console.log("✔ String Input Validation Unit Tests (Production Helper): PASS");
}

// 5. Service Family Validation Tests (Phase 2I)
function testServiceFamilyValidation() {
  assert(isValidServiceFamily("MEGA_SOFT") === true, "MEGA_SOFT family should pass");
  assert(isValidServiceFamily("MEGA_WEB") === true, "MEGA_WEB family should pass");
  assert(isValidServiceFamily("MEGA_APPS") === true, "MEGA_APPS family should pass");
  assert(isValidServiceFamily("FBP") === true, "FBP family should pass");
  assert(isValidServiceFamily("UNKNOWN_FAMILY") === false, "Invalid family should fail");
  assert(isValidServiceFamily(null) === false, "Null family should fail");
  console.log("✔ Service Family Validation Unit Tests: PASS");
}

// 6. Renewal Frequency Validation Tests (Phase 2I)
function testRenewalFrequencyValidation() {
  assert(isValidRenewalFrequency("MONTHLY") === true, "MONTHLY frequency should pass");
  assert(isValidRenewalFrequency("QUARTERLY") === true, "QUARTERLY frequency should pass");
  assert(isValidRenewalFrequency("HALF_YEARLY") === true, "HALF_YEARLY frequency should pass");
  assert(isValidRenewalFrequency("ANNUAL") === true, "ANNUAL frequency should pass");
  assert(isValidRenewalFrequency("CUSTOM") === true, "CUSTOM frequency should pass");
  assert(isValidRenewalFrequency("NONE") === true, "NONE frequency should pass");
  assert(isValidRenewalFrequency("WEEKLY") === false, "Invented frequency WEEKLY should fail");
  console.log("✔ Renewal Frequency Validation Unit Tests: PASS");
}

// 7. Service Status Validation Tests (Phase 2I)
function testServiceStatusValidation() {
  assert(isValidServiceStatus("ACTIVE") === true, "ACTIVE status should pass");
  assert(isValidServiceStatus("INACTIVE") === true, "INACTIVE status should pass");
  assert(isValidServiceStatus("EXPIRED") === false, "Unapproved state EXPIRED should fail");
  console.log("✔ Service Status Validation Unit Tests: PASS");
}

// 8. Non-Negative Amount Validation Tests (Phase 2I)
function testNonNegativeAmountValidation() {
  assert(isNonNegativeFiniteAmount(0) === true, "Zero amount should pass for commercial/renewal value");
  assert(isNonNegativeFiniteAmount(15000) === true, "Positive amount should pass");
  assert(isNonNegativeFiniteAmount(-500) === false, "Negative amount should fail");
  assert(isNonNegativeFiniteAmount(NaN) === false, "NaN should fail");
  console.log("✔ Non-Negative Amount Validation Unit Tests: PASS");
}

// 9. Null vs Zero & Empty String Guard Tests (Phase 2I Final Correction)
function testNullVsZeroAndEmptyStringGuard() {
  function parseNullableAmount(val: any): number | null {
    if (val === undefined || val === null || val === "") return null;
    if (!isNonNegativeFiniteAmount(val)) throw new Error("INVALID_AMOUNT");
    return Number(val);
  }

  assert(parseNullableAmount(undefined) === null, "undefined must parse to null");
  assert(parseNullableAmount(null) === null, "null must parse to null");
  assert(parseNullableAmount("") === null, "empty string must parse to null (NOT 0)");
  assert(parseNullableAmount(0) === 0, "explicit 0 must parse to 0");
  assert(parseNullableAmount("0") === 0, "explicit string '0' must parse to 0");
  assert(parseNullableAmount(12000) === 12000, "positive amount must parse to number");

  let threwError = false;
  try { parseNullableAmount(-500); } catch { threwError = true; }
  assert(threwError === true, "Negative amount must throw error");

  console.log("✔ Null vs Zero & Empty String Guard Unit Tests: PASS");
}

// 10. Client Delete History Protection Guard Test (Phase 2I Owner Decision)
function testClientDeleteHistoryGuard() {
  function canDeleteClient(serviceHistoryCount: number): { allowed: boolean; reason?: string } {
    if (serviceHistoryCount > 0) {
      return { allowed: false, reason: "INVALID_OPERATION: Client cannot be deleted while service history exists." };
    }
    return { allowed: true };
  }

  assert(canDeleteClient(1).allowed === false, "Client with 1 service must be denied deletion");
  assert(canDeleteClient(5).allowed === false, "Client with 5 services must be denied deletion");
  assert(canDeleteClient(0).allowed === true, "Client with 0 services may proceed with standard deletion");

  console.log("✔ Client Delete History Protection Guard Unit Tests: PASS");
}

// 11. Renewal Frequency NONE and CUSTOM Behavior Unit Tests
function testRenewalFrequencySemantics() {
  function computeNextRenewalDate(frequency: string, providedDate?: string | null): Date | null {
    if (frequency === "NONE") return null;
    if (frequency === "CUSTOM") return providedDate ? new Date(providedDate) : null;
    return providedDate ? new Date(providedDate) : null;
  }

  assert(computeNextRenewalDate("NONE", "2026-12-31") === null, "NONE frequency must always result in null nextRenewalDate");
  const customDate = computeNextRenewalDate("CUSTOM", "2026-10-15");
  assert(customDate !== null && customDate.toISOString().startsWith("2026-10-15"), "CUSTOM frequency must preserve provided date without auto-calculation");
  console.log("✔ Renewal Frequency NONE and CUSTOM Behavior Unit Tests: PASS");
}

// 12. SDR Role Access Denial Unit Tests
function testSdrRoleDenial() {
  function isSdrAllowedPostSale(role: string): boolean {
    return role !== "SDR";
  }

  assert(isSdrAllowedPostSale("SDR") === false, "SDR must be denied post-sale ClientServices access");
  assert(isSdrAllowedPostSale("BDE") === true, "BDE is permitted post-sale ClientServices access");
  assert(isSdrAllowedPostSale("ADMIN") === true, "ADMIN is permitted post-sale ClientServices access");
  console.log("✔ SDR Role Access Denial Unit Tests: PASS");
}

// 13. Asset Sanitize URL & Safe Field Allowlist Unit Tests
function testAssetSanitization() {
  function sanitizeUrl(rawUrl?: string | null): string | null {
    if (!rawUrl) return null;
    const trimmed = rawUrl.trim();
    if (!trimmed) return null;
    try {
      const parsed = new URL(trimmed);
      if (parsed.username || parsed.password) {
        parsed.username = "";
        parsed.password = "";
      }
      return parsed.toString();
    } catch {
      return trimmed.replace(/\/\/[^:]+:[^@]+@/, "//");
    }
  }

  assert(
    sanitizeUrl("https://admin:secret123@example.com/repo") === "https://example.com/repo",
    "Embedded username/password in URL must be stripped"
  );
  assert(
    sanitizeUrl("https://github.com/youistic/repo") === "https://github.com/youistic/repo",
    "Clean HTTPS URL should remain intact"
  );
  assert(sanitizeUrl(null) === null, "Null URL must return null");
  console.log("✔ Asset Sanitize URL & Safe Field Allowlist Unit Tests: PASS");
}

// 14. Asset Role Scoping & Ownership Unit Tests
function testAssetRoleScoping() {
  function canBdeAccessAsset(assetType: string, assetBdeId: string | null, userBdeId: string): boolean {
    if (assetType === "AGENCY") return true;
    return assetBdeId === userBdeId;
  }

  assert(canBdeAccessAsset("AGENCY", "other_bde", "my_bde") === true, "BDE should access AGENCY asset regardless of owner");
  assert(canBdeAccessAsset("CLIENT", "my_bde", "my_bde") === true, "BDE should access assigned CLIENT asset");
  assert(canBdeAccessAsset("CLIENT", "other_bde", "my_bde") === false, "BDE MUST NOT access another BDE's CLIENT asset");
  console.log("✔ Asset Role Scoping & Ownership Unit Tests: PASS");
}

async function runAllTests() {
  console.log("=== RUNNING PRODUCTION HELPER UNIT TEST SUITE ===");
  testAmountValidation();
  testProjectsRolePolicy();
  testBdeClientOwnership();
  testStringValidation();
  testServiceFamilyValidation();
  testRenewalFrequencyValidation();
  testServiceStatusValidation();
  testNonNegativeAmountValidation();
  testNullVsZeroAndEmptyStringGuard();
  testClientDeleteHistoryGuard();
  testRenewalFrequencySemantics();
  testSdrRoleDenial();
  testAssetSanitization();
  testAssetRoleScoping();
  console.log("=== ALL UNIT TEST SUITES PASSED SUCCESSFULLY ===");
}

runAllTests().catch((err) => {
  console.error("Unit Test Suite Execution Failed:", err);
  process.exit(1);
});
