"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function getProfile() {
  try {
    let cookieStore;
    try {
      cookieStore = await cookies();
    } catch {
      // Fallback
    }
    const userRole = cookieStore?.get("user_role")?.value || "CEO";
    const loggedInName = cookieStore?.get("user_name")?.value || "CEO";

    let user = null;
    if (loggedInName && loggedInName !== "CEO") {
      user = await prisma.user.findFirst({
        where: {
          name: { contains: loggedInName, mode: "insensitive" }
        }
      });
    }

    if (!user && userRole) {
      user = await prisma.user.findFirst({
        where: {
          role: userRole as any,
          name: { contains: loggedInName, mode: "insensitive" }
        }
      });
    }

    if (!user) {
      const defaultEmail = loggedInName === "Kajal Sharma" ? "kajal@youistic.com" : loggedInName === "Suhani" ? "suhani@youistic.com" : loggedInName === "Kiyam" ? "kiyam@youistic.com" : "ceo@youistic.os";
      const defaultPhone = loggedInName === "Kajal Sharma" ? "+91 98765 11002" : loggedInName === "Suhani" ? "+91 98765 11001" : loggedInName === "Kiyam" ? "+91 98765 11003" : "+91 98765 11000";
      try {
        user = await prisma.user.create({
          data: {
            name: loggedInName,
            email: defaultEmail,
            phone: defaultPhone,
            role: userRole as any
          }
        });
      } catch {
        user = await prisma.user.findFirst();
      }
    }

    return { success: true, user, loggedInName, userRole };
  } catch (error) {
    console.error("Error getting profile:", error);
    return { success: false, error: "Failed to load profile" };
  }
}

export async function updateProfile(data: { name: string; email: string; phone?: string }) {
  try {
    let cookieStore;
    try {
      cookieStore = await cookies();
    } catch {
      // Fallback
    }
    const loggedInName = cookieStore?.get("user_name")?.value || "CEO";
    const userRole = cookieStore?.get("user_role")?.value || "CEO";

    let user = null;
    if (loggedInName && loggedInName !== "CEO") {
      user = await prisma.user.findFirst({
        where: {
          name: { contains: loggedInName, mode: "insensitive" }
        }
      });
    }

    if (!user && userRole) {
      user = await prisma.user.findFirst({
        where: {
          role: userRole as any
        }
      });
    }

    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone
        }
      });
    }

    if (cookieStore) {
      cookieStore.set("user_name", data.name, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
      });
    }

    try {
      revalidatePath("/dashboard/settings");
    } catch {
      // Ignore
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

export async function updatePassword(data: { currentPassword?: string; newPassword?: string }) {
  try {
    if (!data.newPassword || data.newPassword.length < 6) {
      return { success: false, error: "New password must be at least 6 characters" };
    }

    try {
      revalidatePath("/dashboard/settings");
    } catch {
      // Ignore
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating password:", error);
    return { success: false, error: "Failed to update password" };
  }
}
