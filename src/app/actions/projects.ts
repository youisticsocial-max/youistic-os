"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getProjects() {
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

/**
 * Call this once to auto-create missing project records for clients.
 * NOT called on every page load — only when explicitly needed.
 */
export async function syncClientProjects() {
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
    revalidatePath("/dashboard/projects");
    return project;
  } catch (error) {
    console.error("Failed to create project:", error);
    throw error;
  }
}

export async function updateProjectStatus(id: string, status: "PLANNING" | "IN_PROGRESS" | "REVIEW" | "DELIVERED") {
  try {
    const updated = await prisma.project.update({
      where: { id },
      data: { status: status as any },
    });
    revalidatePath("/dashboard/projects");
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
  try {
    const task = await prisma.task.create({
      data: {
        title: data.title,
        projectId: data.projectId,
        stage: (data.stage as any) || "TODO",
        priority: (data.priority as any) || "MEDIUM",
      },
    });
    revalidatePath("/dashboard/projects");
    return task;
  } catch (error) {
    console.error("Failed to create task:", error);
    throw error;
  }
}

export async function updateTaskStage(id: string, stage: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE") {
  try {
    const updated = await prisma.task.update({
      where: { id },
      data: { stage: stage as any },
    });
    revalidatePath("/dashboard/projects");
    return updated;
  } catch (error) {
    console.error("Failed to update task stage:", error);
    throw error;
  }
}

export async function deleteTask(id: string) {
  try {
    await prisma.task.delete({ where: { id } });
    revalidatePath("/dashboard/projects");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete task:", error);
    throw error;
  }
}

export async function deleteAllProjectsAndTasks() {
  try {
    await prisma.task.deleteMany({});
    await prisma.project.deleteMany({});
    revalidatePath("/dashboard/projects");
    revalidatePath("/ceo/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete projects and tasks:", error);
    throw error;
  }
}

