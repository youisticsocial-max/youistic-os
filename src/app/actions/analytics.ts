"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { ServiceFamily } from "@prisma/client";

export async function getAnalyticsData(params?: {
  clientId?: string;
  family?: ServiceFamily;
}) {
  const session = await requireRole(["ADMIN", "BDE"]);

  // If BDE, verify client scoping if clientId is provided
  if (session.role === "BDE" && params?.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: params.clientId },
      select: { assignedBdeId: true },
    });
    if (!client || client.assignedBdeId !== session.userId) {
      throw new Error("FORBIDDEN: You can only view analytics for clients assigned to you.");
    }
  }

  // 1. Fetch available clients for selector dropdown (filtered if BDE)
  const clientWhere = session.role === "BDE" ? { assignedBdeId: session.userId } : {};
  const availableClients = await prisma.client.findMany({
    where: clientWhere,
    select: { id: true, companyName: true, contactPerson: true },
    orderBy: { companyName: "asc" },
  });

  // 2. Client-Specific View
  if (params?.clientId) {
    const client = await prisma.client.findUnique({
      where: { id: params.clientId },
      include: {
        clientServices: {
          include: { offering: true },
          orderBy: { createdAt: "desc" },
        },
        revenueEntries: {
          orderBy: { paymentDate: "desc" },
        },
        invoices: {
          orderBy: { issueDate: "desc" },
        },
      },
    });

    if (!client) {
      throw new Error("NOT_FOUND: Client not found.");
    }

    // Active Service Value Calculation
    let activeServiceValue = 0;
    let knownActiveServices = 0;
    let unknownActiveServices = 0;

    // Lifetime Client Business Value Calculation
    let lifetimeBusinessValue = 0;
    let knownLifetimeServices = 0;
    let unknownLifetimeServices = 0;

    for (const cs of client.clientServices) {
      if (cs.status === "ACTIVE") {
        if (cs.commercialValue !== null && cs.commercialValue !== undefined) {
          activeServiceValue += Number(cs.commercialValue);
          knownActiveServices++;
        } else {
          unknownActiveServices++;
        }
      }

      if (cs.commercialValue !== null && cs.commercialValue !== undefined) {
        lifetimeBusinessValue += Number(cs.commercialValue);
        knownLifetimeServices++;
      } else {
        unknownLifetimeServices++;
      }
    }

    // Actual Receipts Received (PAID entries only)
    const totalPaymentsReceived = client.revenueEntries
      .filter((r) => r.paymentStatus === "PAID")
      .reduce((acc, r) => acc + Number(r.amount), 0);

    // Receivables Calculation
    const totalInvoiced = client.invoices.reduce((acc, inv) => acc + Number(inv.amount), 0);
    const totalOutstandingReceivables = client.invoices
      .filter((inv) => inv.status === "ISSUED" || inv.status === "OVERDUE")
      .reduce((acc, inv) => acc + Number(inv.amount), 0);

    return {
      isClientView: true,
      client: {
        id: client.id,
        companyName: client.companyName,
        contactPerson: client.contactPerson,
        serviceType: client.serviceType,
        status: client.status,
      },
      availableClients,
      metrics: {
        activeServiceValue,
        knownActiveServices,
        unknownActiveServices,
        lifetimeBusinessValue,
        knownLifetimeServices,
        unknownLifetimeServices,
        totalPaymentsReceived,
        totalInvoiced,
        totalOutstandingReceivables,
        servicesCount: client.clientServices.length,
        paymentsCount: client.revenueEntries.length,
        invoicesCount: client.invoices.length,
      },
      clientServices: client.clientServices,
      revenueEntries: client.revenueEntries,
      invoices: client.invoices,
    };
  }

  // 3. Global Ecosystem View
  const [allServices, allRevenues, allInvoices] = await Promise.all([
    prisma.clientService.findMany({
      where: session.role === "BDE" ? { client: { assignedBdeId: session.userId } } : {},
      include: { offering: true },
    }),
    prisma.revenueEntry.findMany({
      where: session.role === "BDE" ? { client: { assignedBdeId: session.userId } } : {},
      include: { clientService: { include: { offering: true } } },
    }),
    prisma.invoice.findMany({
      where: session.role === "BDE" ? { client: { assignedBdeId: session.userId } } : {},
    }),
  ]);

  // Aggregate Metrics
  let totalActiveServiceValue = 0;
  let totalLifetimeBusinessValue = 0;

  const familyBreakdown: Record<string, { activeValue: number; revenueReceived: number; servicesCount: number }> = {
    MEGA_SOFT: { activeValue: 0, revenueReceived: 0, servicesCount: 0 },
    MEGA_WEB: { activeValue: 0, revenueReceived: 0, servicesCount: 0 },
    MEGA_APPS: { activeValue: 0, revenueReceived: 0, servicesCount: 0 },
    FBP: { activeValue: 0, revenueReceived: 0, servicesCount: 0 },
  };

  for (const cs of allServices) {
    const family = cs.offering.family;
    if (familyBreakdown[family]) {
      familyBreakdown[family].servicesCount++;
    }

    if (cs.commercialValue !== null && cs.commercialValue !== undefined) {
      const val = Number(cs.commercialValue);
      totalLifetimeBusinessValue += val;
      if (cs.status === "ACTIVE") {
        totalActiveServiceValue += val;
        if (familyBreakdown[family]) {
          familyBreakdown[family].activeValue += val;
        }
      }
    }
  }

  const totalRevenueReceived = allRevenues
    .filter((r) => r.paymentStatus === "PAID")
    .reduce((acc, r) => {
      const val = Number(r.amount);
      const family = r.clientService?.offering?.family;
      if (family && familyBreakdown[family]) {
        familyBreakdown[family].revenueReceived += val;
      }
      return acc + val;
    }, 0);

  const totalOutstandingReceivables = allInvoices
    .filter((inv) => inv.status === "ISSUED" || inv.status === "OVERDUE")
    .reduce((acc, inv) => acc + Number(inv.amount), 0);

  return {
    isClientView: false,
    availableClients,
    metrics: {
      totalActiveServiceValue,
      totalLifetimeBusinessValue,
      totalRevenueReceived,
      totalOutstandingReceivables,
      totalServicesCount: allServices.length,
      totalRevenuesCount: allRevenues.length,
      totalInvoicesCount: allInvoices.length,
    },
    familyBreakdown,
  };
}
