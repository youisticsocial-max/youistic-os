import crypto from "crypto";
import { cookies } from "next/headers";
import { UserRole } from "@prisma/client";

export interface SessionPayload {
  userId: string;
  email: string;
  role: UserRole;
  name: string;
  iat: number;
  exp: number;
}

const SESSION_COOKIE_NAME = "youistic_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 Days

function getSecretKey(): string {
  const secret = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error(
      "SECURITY ERROR: SESSION_SECRET (or NEXTAUTH_SECRET) environment variable is missing or too short (minimum 32 characters required)."
    );
  }
  return secret.trim();
}

/**
 * Encodes and HMAC-SHA256 signs a session payload.
 */
export function signSessionToken(user: {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}): string {
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + SESSION_MAX_AGE_SECONDS;
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    iat,
    exp,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const hmac = crypto.createHmac("sha256", getSecretKey());
  hmac.update(payloadBase64);
  const signature = hmac.digest("base64url");

  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies the HMAC-SHA256 signature and expiration of a session token.
 * Returns null if token is forged, tampered, or expired.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== "string") return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;

  try {
    const expectedHmac = crypto.createHmac("sha256", getSecretKey());
    expectedHmac.update(payloadBase64);
    const expectedSignature = expectedHmac.digest("base64url");

    // Timing-safe comparison to prevent side-channel attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf8");
    const payload: SessionPayload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Creates and sets an httpOnly, secure session cookie in Next.js response context.
 */
export async function createSessionCookie(user: {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}) {
  const token = signSessionToken(user);
  const cookieStore = await cookies();

  // Set httpOnly secure session cookie
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  // Maintain client-side readable display name for UI rendering without granting auth privileges
  cookieStore.set("user_name", user.name, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Clears the session cookie on logout.
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete("user_role");
  cookieStore.delete("user_name");
}

/**
 * Reads and verifies the current session from incoming request cookies.
 */
export async function getAuthenticatedSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

/**
 * Server-side guard: Requires an active, verified session. Throws Error if missing or invalid.
 */
export async function requireAuth(): Promise<SessionPayload> {
  const session = await getAuthenticatedSession();
  if (!session) {
    throw new Error("UNAUTHORIZED: Active authenticated session required.");
  }
  return session;
}

/**
 * Server-side RBAC guard: Requires an active session with role matching allowedRoles.
 */
export async function requireRole(allowedRoles: (UserRole | "CEO")[]): Promise<SessionPayload> {
  const session = await requireAuth();

  // Normalize CEO role alias to ADMIN if needed
  const normalizedAllowed = allowedRoles.map((r) => (r === "CEO" ? UserRole.ADMIN : r));

  if (!normalizedAllowed.includes(session.role)) {
    throw new Error(
      `FORBIDDEN: Role '${session.role}' is not authorized to perform this operation.`
    );
  }

  return session;
}
