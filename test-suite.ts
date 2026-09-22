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

async function runAllTests() {
  console.log("=== RUNNING PRODUCTION HELPER UNIT TEST SUITE ===");
  testAmountValidation();
  testProjectsRolePolicy();
  testBdeClientOwnership();
  testStringValidation();
  console.log("=== ALL UNIT TEST SUITES PASSED SUCCESSFULLY ===");
}

runAllTests().catch((err) => {
  console.error("Unit Test Suite Execution Failed:", err);
  process.exit(1);
});
