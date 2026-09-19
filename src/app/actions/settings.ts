"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createSessionCookie, getAuthenticatedSession, requireAuth } from "@/lib/auth";

export async function getProfile() {
  try {
    const session = await getAuthenticatedSession();
    if (!session) {
      return { success: false, error: "Not authenticated" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.isActive) {
      return { success: false, error: "User profile not found or inactive." };
    }

    return {
      success: true,
      user,
      loggedInName: session.name,
      userRole: session.role,
    };
  } catch (error) {
    console.error("Error getting profile:", error);
    return { success: false, error: "Failed to load profile" };
  }
}

export async function updateProfile(data: { name: string; email: string; phone?: string }) {
  try {
    const session = await requireAuth();

    await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
      },
    });

    try {
      revalidatePath("/dashboard/settings");
    } catch {
      // Ignore outside request context
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, error: "Failed to update profile" };
  }
}

export async function updatePassword(data: { currentPassword?: string; newPassword?: string }) {
  try {
    const session = await requireAuth();

    if (!data.newPassword || data.newPassword.length < 12) {
      return { success: false, error: "New password must be at least 12 characters long." };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || !user.isActive) {
      return { success: false, error: "User account not found or inactive." };
    }

    // Verify current password
    if (user.passwordHash && data.currentPassword) {
      const isValid = bcrypt.compareSync(data.currentPassword, user.passwordHash);
      if (!isValid) {
        return { success: false, error: "Current password is incorrect." };
      }
    }

    // Hash new password and increment sessionVersion to revoke all older active sessions
    const newPasswordHash = bcrypt.hashSync(data.newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        sessionVersion: { increment: 1 },
      },
    });

    // Re-issue session cookie for the current logged-in user with updated sessionVersion
    await createSessionCookie({
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      name: updatedUser.name,
      sessionVersion: updatedUser.sessionVersion,
    });

    try {
      revalidatePath("/dashboard/settings");
    } catch {
      // Ignore
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating password:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update password",
    };
  }
}
