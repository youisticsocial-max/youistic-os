"use server";

import { cookies } from "next/headers";

export async function verifyAndLogin(role: "CEO" | "SDR" | "BDE", passwordInput?: string, employeeName?: string) {
  const trimmed = (passwordInput || "").trim();
  let authenticatedName = employeeName || role;

  if (role === "CEO") {
    if (trimmed !== "@nehran#0225!Ok") {
      return { success: false, error: "Invalid password. Please try again." };
    }
    authenticatedName = "CEO";
  } else if (role === "SDR") {
    if (trimmed === "Sshh123456") {
      authenticatedName = "Suhani";
    } else if (trimmed === "Ks123456") {
      authenticatedName = "Kajal Sharma";
    } else if (trimmed === "SDR123456") {
      authenticatedName = employeeName || "Suhani";
    } else {
      return { success: false, error: "Invalid password. Please try again." };
    }
  } else if (role === "BDE") {
    if (trimmed === "Kym123456" || trimmed === "BDE123456") {
      authenticatedName = "Kiyam";
    } else {
      return { success: false, error: "Invalid password. Please try again." };
    }
  }

  const cookieStore = await cookies();
  cookieStore.set("user_role", role, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  cookieStore.set("user_name", authenticatedName, {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });

  return { success: true, role, userName: authenticatedName };
}

export async function loginAction(role: "CEO" | "SDR" | "BDE", passwordInput?: string, employeeName?: string) {
  const res = await verifyAndLogin(role, passwordInput, employeeName);
  if (!res.success) {
    throw new Error(res.error);
  }
  return res;
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("user_role");
  cookieStore.delete("user_name");
}
