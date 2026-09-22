/**
 * YOUISTIC BUSINESS OS — SHARED VALIDATION & AUTHORIZATION HELPERS
 * Exported pure functions used by server actions and tested by unit test suite.
 */

/**
 * Checks if a value is a valid, finite positive number (> 0).
 */
export function isPositiveFiniteAmount(val: any): boolean {
  const num = typeof val === "number" ? val : Number(val);
  return Number.isFinite(num) && num > 0;
}

/**
 * Validates if a role is permitted to access Projects/Delivery module by default.
 * Locked Decision: ADMIN and BDE are allowed; SDR is DENIED.
 */
export function canRoleAccessProjects(role: string): boolean {
  return role === "ADMIN" || role === "BDE";
}

/**
 * Checks if a BDE user is authorized for a specific client based on assignment.
 * ADMIN is always authorized; BDE is authorized if client.assignedBdeId matches userId.
 */
export function isBdeClientAuthorized(clientBdeId: string | null | undefined, userId: string, role: string): boolean {
  if (role === "ADMIN") return true;
  if (role === "BDE") return Boolean(clientBdeId && clientBdeId === userId);
  return false;
}

/**
 * Checks if input is a valid non-empty string.
 */
export function isValidNonEmptyString(val: any): boolean {
  return typeof val === "string" && val.trim().length > 0;
}

/**
 * Checks if a value is a finite non-negative number (>= 0).
 */
export function isNonNegativeFiniteAmount(val: any): boolean {
  const num = typeof val === "number" ? val : Number(val);
  return Number.isFinite(num) && num >= 0;
}

const ALLOWED_SERVICE_FAMILIES = new Set(["MEGA_SOFT", "MEGA_WEB", "MEGA_APPS", "FBP"]);
const ALLOWED_RENEWAL_FREQUENCIES = new Set(["MONTHLY", "QUARTERLY", "HALF_YEARLY", "ANNUAL", "CUSTOM", "NONE"]);
const ALLOWED_SERVICE_STATUSES = new Set(["ACTIVE", "INACTIVE"]);

/**
 * Validates ServiceFamily enum.
 */
export function isValidServiceFamily(val: any): boolean {
  return typeof val === "string" && ALLOWED_SERVICE_FAMILIES.has(val);
}

/**
 * Validates RenewalFrequency enum.
 */
export function isValidRenewalFrequency(val: any): boolean {
  return typeof val === "string" && ALLOWED_RENEWAL_FREQUENCIES.has(val);
}

/**
 * Validates ServiceStatus enum.
 */
export function isValidServiceStatus(val: any): boolean {
  return typeof val === "string" && ALLOWED_SERVICE_STATUSES.has(val);
}

