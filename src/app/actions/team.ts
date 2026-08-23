"use server";

import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const defaultTeam = [
  { name: "CEO", email: "ceo@youistic.com", role: UserRole.ADMIN, department: "CEO & Executive Lead", phone: "+91 98765 10000" },
  { name: "Kiyam", email: "kiyam@youistic.com", role: UserRole.BDE, department: "BDE Field Sales Specialist", phone: "+91 98765 11003" },
  { name: "Suhani", email: "suhani@youistic.com", role: UserRole.SDR, department: "SDR Lead Pool Specialist", phone: "+91 98765 11001" },
  { name: "Kajal Sharma", email: "kajal@youistic.com", role: UserRole.SDR, department: "SDR Calling Queue Specialist", phone: "+91 98765 11002" },
];

export async function getTeamMembers() {
  try {
    // Safely attempt to clean up legacy mock user names without breaking on FK constraints
    try {
      await prisma.user.deleteMany({
        where: {
          name: { in: ["Sneha Reddy", "Priya Kapoor", "Rohan Sharma", "BDE Lead", "CEO Lead"] },
        },
      });
    } catch (e) {
      // Ignore foreign key deletion errors if leads are attached
    }

    // Fetch active users in a single bulk query
    let users = await prisma.user.findMany({
      where: {
        isActive: true,
        name: { notIn: ["Sneha Reddy", "Priya Kapoor", "Rohan Sharma", "BDE Lead"] },
      },
      include: {
        assignedLeads: true,
        meetings: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Ensure all allowed default team members exist if DB is missing any
    if (users.length < defaultTeam.length) {
      for (const member of defaultTeam) {
        const exists = users.some(u => u.email === member.email || u.name === member.name);
        if (!exists) {
          try {
            await prisma.user.create({ data: member });
          } catch (err) {
            console.error("Error creating team member:", err);
          }
        }
      }
      users = await prisma.user.findMany({
        where: {
          isActive: true,
          name: { notIn: ["Sneha Reddy", "Priya Kapoor", "Rohan Sharma", "BDE Lead"] },
        },
        include: {
          assignedLeads: true,
          meetings: true,
        },
        orderBy: { createdAt: "asc" },
      });
    }

    if (users.length === 0) {
      return fallbackTeamMembers();
    }

    return users.map((u) => {
      const sdrLeads = u.assignedLeads || [];
      const bdeMeetings = u.meetings || [];
      const totalLeads = sdrLeads.length;
      const convertedCount = sdrLeads.filter((l: any) => l.status === "CONVERTED").length;

      let activityLabel = "Active Member";
      let revenue = convertedCount * 45000;
      let closingRatio = totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0;

      if (u.role === UserRole.ADMIN) {
        activityLabel = `📄 ${convertedCount} Proposals Approved`;
      } else if (u.role === UserRole.BDE) {
        activityLabel = `📍 ${bdeMeetings.length} Field Visits`;
      } else {
        activityLabel = `📞 ${totalLeads} Calls Handled`;
      }

      const colorMap: Record<string, string> = {
        SDR: "#6c5ce7",
        BDE: "#e67e22",
        ADMIN: "#34d399",
      };

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department || u.role,
        phone: u.phone || "+91 98765 43210",
        dealsClosedCount: convertedCount,
        revenueGenerated: revenue,
        closingRatio: closingRatio,
        tasksCompleted: totalLeads,
        leadsGenerated: totalLeads,
        activityLabel,
        avatarColor: colorMap[u.role] || "#a29bfe",
        status: u.role === UserRole.BDE ? "FIELD_VISIT" : "ONLINE",
      };
    });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return fallbackTeamMembers();
  }
}

function fallbackTeamMembers() {
  return [
    {
      id: "ceo-1",
      name: "CEO",
      email: "ceo@youistic.com",
      role: "ADMIN",
      department: "CEO & Executive Lead",
      phone: "+91 98765 10000",
      dealsClosedCount: 0,
      revenueGenerated: 0,
      closingRatio: 0,
      tasksCompleted: 0,
      leadsGenerated: 0,
      activityLabel: "📄 0 Proposals Approved",
      avatarColor: "#34d399",
      status: "ONLINE",
    },
    {
      id: "kiyam-1",
      name: "Kiyam",
      email: "kiyam@youistic.com",
      role: "BDE",
      department: "BDE Field Sales Specialist",
      phone: "+91 98765 11003",
      dealsClosedCount: 0,
      revenueGenerated: 0,
      closingRatio: 0,
      tasksCompleted: 0,
      leadsGenerated: 0,
      activityLabel: "📍 0 Field Visits",
      avatarColor: "#e67e22",
      status: "FIELD_VISIT",
    },
    {
      id: "suhani-1",
      name: "Suhani",
      email: "suhani@youistic.com",
      role: "SDR",
      department: "SDR Lead Pool Specialist",
      phone: "+91 98765 11001",
      dealsClosedCount: 0,
      revenueGenerated: 0,
      closingRatio: 0,
      tasksCompleted: 0,
      leadsGenerated: 0,
      activityLabel: "📞 0 Calls Handled",
      avatarColor: "#6c5ce7",
      status: "ONLINE",
    },
    {
      id: "kajal-1",
      name: "Kajal Sharma",
      email: "kajal@youistic.com",
      role: "SDR",
      department: "SDR Calling Queue Specialist",
      phone: "+91 98765 11002",
      dealsClosedCount: 0,
      revenueGenerated: 0,
      closingRatio: 0,
      tasksCompleted: 0,
      leadsGenerated: 0,
      activityLabel: "📞 0 Calls Handled",
      avatarColor: "#a29bfe",
      status: "ONLINE",
    },
  ];
}

export async function createTeamMember(data: { name: string; email: string; role: UserRole; department?: string; phone?: string }) {
  try {
    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role,
        department: data.department || data.role,
        phone: data.phone,
      },
    });
    return newUser;
  } catch (error) {
    console.error("Error creating team member:", error);
    throw error;
  }
}
