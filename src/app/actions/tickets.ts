"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { TicketPriority, TicketStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth";

export async function getTickets(filterName?: string) {
  const session = await requireRole(["ADMIN", "SDR", "BDE", "SUPPORT", "VIEWER"]);
  try {
    const userRole = session.role;
    const loggedInName = session.name;

    const isCeoOrAdmin = userRole === "ADMIN" || loggedInName === "CEO";

    let whereClause: any = {};
    if (!isCeoOrAdmin) {
      whereClause = {
        OR: [
          { createdByName: { contains: loggedInName, mode: "insensitive" } },
          { assignedTo: { name: { contains: loggedInName, mode: "insensitive" } } },
          ...(session.role === "BDE" ? [{ client: { assignedBdeId: session.userId } }] : []),
          ...(session.role === "SDR" ? [{ client: { lead: { assignedSdrId: session.userId } } }] : []),
        ],
      };
    } else if (filterName && filterName !== "ALL") {
      whereClause = {
        OR: [
          { createdByName: { contains: filterName, mode: "insensitive" } },
          { assignedTo: { name: { contains: filterName, mode: "insensitive" } } },
        ],
      };
    }

    const dbTickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        client: true,
        assignedTo: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return {
      userRole,
      loggedInName,
      isCeo: isCeoOrAdmin,
      tickets: dbTickets.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        client: t.client?.companyName || t.clientName || "Client",
        priority: t.priority,
        status: t.status,
        assignee: t.assignedTo?.name || t.createdByName || "Unassigned",
        createdByName: t.createdByName || "Team",
        createdAt: t.createdAt,
        tags: t.tags,
      })),
    };
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return {
      userRole: session.role,
      loggedInName: session.name,
      isCeo: session.role === "ADMIN",
      tickets: [],
    };
  }
}

export async function createTicket(data: {
  title: string;
  clientName: string;
  priority: TicketPriority;
  description?: string;
  clientId?: string;
  assignee?: string;
  tags?: string[];
  createdByName?: string;
}) {
  const session = await requireRole(["ADMIN", "SDR", "BDE", "SUPPORT"]);
  if (!data.title || typeof data.title !== "string" || !data.title.trim()) {
    throw new Error("INVALID_INPUT: Ticket title is required.");
  }
  if (!data.clientName || typeof data.clientName !== "string" || !data.clientName.trim()) {
    throw new Error("INVALID_INPUT: Client name is required.");
  }

  try {
    let currentUserName = data.createdByName || session.name;

    let targetClientId = data.clientId;
    if (!targetClientId && data.clientName) {
      const client = await prisma.client.findFirst({
        where: { companyName: { contains: data.clientName, mode: "insensitive" } },
      });
      if (client) targetClientId = client.id;
    }

    const newTicket = await prisma.supportTicket.create({
      data: {
        title: data.title.trim(),
        clientName: data.clientName.trim(),
        description: data.description || null,
        priority: data.priority || TicketPriority.MEDIUM,
        status: TicketStatus.OPEN,
        createdByName: currentUserName,
        tags: data.tags && data.tags.length > 0 ? data.tags : ["Support", "Tech"],
        clientId: targetClientId || null,
      },
    });

    try {
      revalidatePath("/dashboard/crm/tickets");
    } catch {
      // Ignore if called outside Next.js server action context
    }
    return newTicket;
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
}

export async function updateTicketStatus(ticketId: string, status: TicketStatus) {
  await requireRole(["ADMIN", "SDR", "BDE", "SUPPORT"]);
  if (!ticketId || typeof ticketId !== "string") {
    throw new Error("INVALID_INPUT: Valid ticketId is required.");
  }
  try {
    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        resolvedAt: status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED ? new Date() : null,
      },
    });
    try {
      revalidatePath("/dashboard/crm/tickets");
    } catch {}
    return updated;
  } catch (error) {
    console.error("Error updating ticket status:", error);
    throw error;
  }
}

export async function deleteTicket(ticketId: string) {
  await requireRole(["ADMIN", "SUPPORT"]);
  if (!ticketId || typeof ticketId !== "string") {
    throw new Error("INVALID_INPUT: Valid ticketId is required.");
  }
  try {
    await prisma.ticketComment.deleteMany({ where: { ticketId } });
    await prisma.supportTicket.delete({ where: { id: ticketId } });
    try {
      revalidatePath("/dashboard/crm/tickets");
    } catch {
      // Ignore outside request context
    }
    return { success: true };
  } catch (error) {
    console.error("Error deleting ticket:", error);
    throw error;
  }
}
