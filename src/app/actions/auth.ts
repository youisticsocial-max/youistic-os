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
    if (employeeName === "Kajal Sharma" || trimmed === "Ks123456") {
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

  // Find or provision user record in PostgreSQL database
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: targetEmail },
        { name: { contains: authenticatedName, mode: "insensitive" } },
        { role: targetRoleEnum },
      ],
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: authenticatedName,
        email: targetEmail || `${authenticatedName.toLowerCase().replace(/\s+/g, "")}@youistic.com`,
        role: targetRoleEnum,
        department: `${role} Department`,
      },
    });
  }

  // Seed passwords fallback for initial database bootstrap
  const initialSeedPasswords: Record<string, string[]> = {
    CEO: ["@nehran#0225!Ok"],
    SDR: ["Sshh123456", "Ks123456", "SDR123456"],
    BDE: ["Kym123456", "BDE123456"],
  };

  let isPasswordValid = false;

  if (user.passwordHash) {
    isPasswordValid = bcrypt.compareSync(trimmed, user.passwordHash);
  } else {
    // If user passwordHash is uninitialized, check against seed passwords and hash+store on first login
    const allowedSeedPasswords = initialSeedPasswords[role] || [];
    if (allowedSeedPasswords.includes(trimmed)) {
      isPasswordValid = true;
      const newHash = bcrypt.hashSync(trimmed, 10);
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });
    }
  }

  if (!isPasswordValid) {
    return { success: false, error: "Invalid password. Please try again." };
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
