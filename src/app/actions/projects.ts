"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";

export async function getProjects() {
  await requireRole(["ADMIN", "BDE", "SDR"]);
  try {
    const projects = await prisma.project.findMany({
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
  await requireRole(["ADMIN", "BDE"]);
  try {
    const project = await prisma.project.create({
      data: {
        name: data.name,
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
  await requireRole(["ADMIN", "BDE"]);
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
  await requireRole(["ADMIN", "BDE", "SDR"]);
  try {
    const task = await prisma.task.create({
      data: {
        title: data.title,
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
  await requireRole(["ADMIN", "BDE", "SDR"]);
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
  await requireRole(["ADMIN", "BDE"]);
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
  try {
    await prisma.task.deleteMany({});
    await prisma.project.deleteMany({});
    try {
      revalidatePath("/dashboard/projects");
      revalidatePath("/ceo/dashboard");
    } catch {}
    return { success: true };
  } catch (error) {
    console.error("Failed to delete projects and tasks:", error);
    throw error;
  }
}
