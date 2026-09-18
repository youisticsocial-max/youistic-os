"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";
import { createSessionCookie, clearSessionCookie } from "@/lib/auth";

export async function verifyAndLogin(
  role: "CEO" | "SDR" | "BDE",
  passwordInput?: string,
  employeeName?: string
) {
  const trimmed = (passwordInput || "").trim();
  if (!trimmed) {
    return { success: false, error: "Password is required." };
  }

  let targetRoleEnum: UserRole = UserRole.BDE;
  if (role === "CEO") targetRoleEnum = UserRole.ADMIN;
  else if (role === "SDR") targetRoleEnum = UserRole.SDR;
  else if (role === "BDE") targetRoleEnum = UserRole.BDE;

  let authenticatedName = employeeName || role;
  let targetEmail = "";

  if (role === "CEO") {
    authenticatedName = "CEO";
    targetEmail = "ceo@youistic.com";
  } else if (role === "SDR") {
    if (employeeName === "Kajal Sharma") {
      authenticatedName = "Kajal Sharma";
      targetEmail = "kajal@youistic.com";
    } else {
      authenticatedName = "Suhani";
      targetEmail = "suhani@youistic.com";
    }
  } else if (role === "BDE") {
    authenticatedName = "Kiyam";
    targetEmail = "kiyam@youistic.com";
  }

  // Find user record in PostgreSQL database
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: targetEmail },
        { name: { contains: authenticatedName, mode: "insensitive" } },
        { role: targetRoleEnum },
      ],
    },
  });

  if (!user) {
    return { success: false, error: "Invalid credentials. Please check your credentials and try again." };
  }

  if (!user.passwordHash) {
    return {
      success: false,
      error: "Account initialization required. Please contact system administrator to set up your password.",
    };
  }

  const isPasswordValid = bcrypt.compareSync(trimmed, user.passwordHash);

  if (!isPasswordValid) {
    return { success: false, error: "Invalid credentials. Please check your password and try again." };
  }

  // Issue secure httpOnly, signed session cookie
  await createSessionCookie({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  return { success: true, role, userName: user.name };
}

export async function loginAction(
  role: "CEO" | "SDR" | "BDE",
  passwordInput?: string,
  employeeName?: string
) {
  const res = await verifyAndLogin(role, passwordInput, employeeName);
  if (!res.success) {
    throw new Error(res.error);
  }
  return res;
}

export async function logoutAction() {
  await clearSessionCookie();
}
