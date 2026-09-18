"use server";

import { MeetingStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

export async function getMeetings() {
  await requireRole(["ADMIN", "BDE", "SDR"]);
  try {
    const meetings = await prisma.meeting.findMany({
      orderBy: { meetingDate: "asc" },
      include: {
        host: true,
      },
    });
    return meetings;
  } catch (error) {
    console.error("Failed to fetch meetings:", error);
    return [];
  }
}

export async function deleteAllMeetings() {
  await requireRole(["ADMIN"]);
  try {
    await prisma.meeting.deleteMany({});
    try {
      revalidatePath("/dashboard/bde");
      revalidatePath("/dashboard/sdr");
      revalidatePath("/ceo/dashboard");
    } catch {}
    return { success: true };
  } catch (error) {
    console.error("Failed to delete all meetings:", error);
    throw error;
  }
}

export async function createMeeting(data: {
  title: string;
  meetingDate: Date;
  notes?: string;
  leadId?: string;
  assignedRole?: "CEO" | "BDE" | "SDR";
  hostId?: string;
}) {
  await requireRole(["ADMIN", "BDE", "SDR"]);
  try {
    let hostId = data.hostId;

    if (!hostId) {
      const requestedRole = data.assignedRole || "BDE";
      let roleEnum: UserRole = UserRole.BDE;
      if (requestedRole === "CEO") roleEnum = UserRole.ADMIN;
      else if (requestedRole === "SDR") roleEnum = UserRole.SDR;

      let host = await prisma.user.findFirst({ where: { role: roleEnum } });
      if (!host) {
        host = await prisma.user.findFirst({ where: { role: UserRole.ADMIN } });
      }
      if (!host) {
        host = await prisma.user.create({
          data: {
            name: `${requestedRole} Lead`,
            email: `${requestedRole.toLowerCase()}@youistic.com`,
            role: roleEnum,
          },
        });
      }
      hostId = host.id;
    }

    const meeting = await prisma.meeting.create({
      data: {
        title: data.title,
        meetingDate: data.meetingDate,
        notes: data.notes,
        hostId: hostId,
        leadId: data.leadId,
      },
    });
    try {
      revalidatePath("/dashboard/bde");
      revalidatePath("/dashboard/sdr");
      revalidatePath("/dashboard");
      revalidatePath("/ceo/dashboard");
    } catch {}
    return meeting;
  } catch (error) {
    console.error("Failed to create meeting:", error);
    throw new Error("Failed to create meeting");
  }
}

export async function updateMeetingStatus(id: string, status: MeetingStatus) {
  await requireRole(["ADMIN", "BDE", "SDR"]);
  try {
    const meeting = await prisma.meeting.update({
      where: { id },
      data: { status },
    });
    try { revalidatePath("/dashboard/bde"); } catch {}
    return meeting;
  } catch (error) {
    console.error("Failed to update meeting status:", error);
    throw new Error("Failed to update meeting status");
  }
}

export async function updateMeetingDetails(id: string, data: {
  status?: MeetingStatus;
  meetingDate?: Date;
  notes?: string;
}) {
  await requireRole(["ADMIN", "BDE", "SDR"]);
  try {
    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.meetingDate ? { meetingDate: data.meetingDate } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
    try {
      revalidatePath("/dashboard/bde");
      revalidatePath("/dashboard/sdr");
    } catch {}
    return meeting;
  } catch (error) {
    console.error("Failed to update meeting details:", error);
    throw new Error("Failed to update meeting details");
  }
}

export async function deleteMeeting(id: string) {
  await requireRole(["ADMIN", "BDE"]);
  try {
    await prisma.meeting.delete({
      where: { id }
    });
    try {
      revalidatePath("/dashboard/bde");
      revalidatePath("/dashboard/sdr");
    } catch {}
  } catch (error) {
    console.error("Failed to delete meeting:", error);
    throw new Error("Failed to delete meeting");
  }
}
