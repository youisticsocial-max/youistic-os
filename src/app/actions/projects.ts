"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { canRoleAccessProjects, isBdeClientAuthorized, isValidNonEmptyString } from "@/lib/validation";

export async function getProjects() {
  const session = await requireRole(["ADMIN", "BDE"]);
  try {
    let whereClause: any = {};
    if (session.role === "BDE") {
      whereClause = { client: { assignedBdeId: session.userId } };
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        client: true,
        tasks: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return projects;
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return [];
  }
}

export async function syncClientProjects() {
  await requireRole(["ADMIN", "BDE"]);
  try {
    const clients = await prisma.client.findMany({
      include: { projects: true }
    });

    const toCreate = clients.filter(c => !c.projects || c.projects.length === 0);

    if (toCreate.length > 0) {
      await prisma.project.createMany({
        data: toCreate.map(client => {
          const isHumjoli = client.companyName.toLowerCase().includes("humjoli");
          return {
            name: `${client.companyName} Deliverables`,
            description: `Project execution & client deliverable for ${client.companyName}`,
            type: client.serviceType || "TECH",
            status: isHumjoli ? "DELIVERED" : "IN_PROGRESS",
            progress: isHumjoli ? 100 : 25,
            clientId: client.id,
          };
        }),
        skipDuplicates: true,
      });
    }
    return { synced: toCreate.length };
  } catch (error) {
    console.error("Failed to sync client projects:", error);
    return { synced: 0 };
  }
}

export async function createProject(data: {
  name: string;
  clientId: string;
  type?: "TECH" | "FBP" | "HYBRID";
  status?: "PLANNING" | "IN_PROGRESS" | "REVIEW" | "DELIVERED";
  description?: string;
}) {
  const session = await requireRole(["ADMIN", "BDE"]);
  if (!isValidNonEmptyString(data.name)) {
    throw new Error("INVALID_INPUT: Project name is required.");
  }
  if (!isValidNonEmptyString(data.clientId)) {
    throw new Error("INVALID_INPUT: Valid clientId is required.");
  }

  // IDOR & Scope Check for BDE
  if (session.role === "BDE") {
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { assignedBdeId: true },
    });
    if (!client || !isBdeClientAuthorized(client.assignedBdeId, session.userId, session.role)) {
      throw new Error("FORBIDDEN: You can only create projects for clients assigned to you.");
    }
  }

  try {
    const project = await prisma.project.create({
      data: {
        name: data.name.trim(),
        clientId: data.clientId,
        type: data.type || "TECH",
        status: (data.status as any) || "IN_PROGRESS",
        description: data.description || null,
      },
    });
    try { revalidatePath("/dashboard/projects"); } catch {}
    return project;
  } catch (error) {
    console.error("Failed to create project:", error);
    throw error;
  }
}

export async function updateProjectStatus(id: string, status: "PLANNING" | "IN_PROGRESS" | "REVIEW" | "DELIVERED") {
  const session = await requireRole(["ADMIN", "BDE"]);
  if (!isValidNonEmptyString(id)) {
    throw new Error("INVALID_INPUT: Valid project id is required.");
  }

  // IDOR & Scope Check for BDE
  if (session.role === "BDE") {
    const project = await prisma.project.findUnique({
      where: { id },
      select: { client: { select: { assignedBdeId: true } } },
    });
    if (!project || !isBdeClientAuthorized(project.client?.assignedBdeId, session.userId, session.role)) {
      throw new Error("FORBIDDEN: You can only update status for projects assigned to you.");
    }
  }

  try {
    const updated = await prisma.project.update({
      where: { id },
      data: { status: status as any },
    });
    try { revalidatePath("/dashboard/projects"); } catch {}
    return updated;
  } catch (error) {
    console.error("Failed to update project status:", error);
    throw error;
  }
}

export async function createTask(data: {
  title: string;
  projectId: string;
  stage?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
}) {
  const session = await requireRole(["ADMIN", "BDE"]);
  if (!isValidNonEmptyString(data.title)) {
    throw new Error("INVALID_INPUT: Task title is required.");
  }
  if (!isValidNonEmptyString(data.projectId)) {
    throw new Error("INVALID_INPUT: Valid projectId is required.");
  }

  if (session.role === "BDE") {
    const project = await prisma.project.findUnique({
      where: { id: data.projectId },
      select: { client: { select: { assignedBdeId: true } } },
    });
    if (!project || !isBdeClientAuthorized(project.client?.assignedBdeId, session.userId, session.role)) {
      throw new Error("FORBIDDEN: You can only create tasks for projects assigned to you.");
    }
  }

  try {
    const task = await prisma.task.create({
      data: {
        title: data.title.trim(),
        projectId: data.projectId,
        stage: (data.stage as any) || "TODO",
        priority: (data.priority as any) || "MEDIUM",
      },
    });
    try { revalidatePath("/dashboard/projects"); } catch {}
    return task;
  } catch (error) {
    console.error("Failed to create task:", error);
    throw error;
  }
}

export async function updateTaskStage(id: string, stage: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE") {
  const session = await requireRole(["ADMIN", "BDE"]);
  if (!isValidNonEmptyString(id)) {
    throw new Error("INVALID_INPUT: Valid task id is required.");
  }

  if (session.role === "BDE") {
    const task = await prisma.task.findUnique({
      where: { id },
      select: { project: { select: { client: { select: { assignedBdeId: true } } } } },
    });
    if (!task || !isBdeClientAuthorized(task.project?.client?.assignedBdeId, session.userId, session.role)) {
      throw new Error("FORBIDDEN: You can only update tasks for projects assigned to you.");
    }
  }

  try {
    const updated = await prisma.task.update({
      where: { id },
      data: { stage: stage as any },
    });
    try { revalidatePath("/dashboard/projects"); } catch {}
    return updated;
  } catch (error) {
    console.error("Failed to update task stage:", error);
    throw error;
  }
}

export async function deleteTask(id: string) {
  const session = await requireRole(["ADMIN", "BDE"]);
  if (!isValidNonEmptyString(id)) {
    throw new Error("INVALID_INPUT: Valid task id is required.");
  }

  if (session.role === "BDE") {
    const task = await prisma.task.findUnique({
      where: { id },
      select: { project: { select: { client: { select: { assignedBdeId: true } } } } },
    });
    if (!task || !isBdeClientAuthorized(task.project?.client?.assignedBdeId, session.userId, session.role)) {
      throw new Error("FORBIDDEN: You can only delete tasks for projects assigned to you.");
    }
  }

  try {
    await prisma.task.delete({ where: { id } });
    try { revalidatePath("/dashboard/projects"); } catch {}
    return { success: true };
  } catch (error) {
    console.error("Failed to delete task:", error);
    throw error;
  }
}

export async function deleteAllProjectsAndTasks() {
  await requireRole(["ADMIN"]);
  throw new Error("DISABLED: Bulk deletion of all projects and tasks is disabled.");
}
