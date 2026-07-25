"use server";

import { MeetingStatus, UserRole } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getMeetings() {
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
  try {
    await prisma.meeting.deleteMany({});
    revalidatePath("/dashboard/bde");
    revalidatePath("/dashboard/sdr");
    revalidatePath("/ceo/dashboard");
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
    revalidatePath("/dashboard/bde");
    revalidatePath("/dashboard/sdr");
    revalidatePath("/dashboard");
    revalidatePath("/ceo/dashboard");
    return meeting;
  } catch (error) {
    console.error("Failed to create meeting:", error);
    throw new Error("Failed to create meeting");
  }
}

export async function updateMeetingStatus(id: string, status: MeetingStatus) {
  try {
    const meeting = await prisma.meeting.update({
      where: { id },
      data: { status },
    });
    revalidatePath("/dashboard/bde");
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
  try {
    const meeting = await prisma.meeting.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.meetingDate ? { meetingDate: data.meetingDate } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
    revalidatePath("/dashboard/bde");
    revalidatePath("/dashboard/sdr");
    return meeting;
  } catch (error) {
    console.error("Failed to update meeting details:", error);
    throw new Error("Failed to update meeting details");
  }
}

export async function deleteMeeting(id: string) {
  try {
    await prisma.meeting.delete({
      where: { id }
    });
    revalidatePath("/dashboard/bde");
    revalidatePath("/dashboard/sdr");
  } catch (error) {
    console.error("Failed to delete meeting:", error);
    throw new Error("Failed to delete meeting");
  }
}
