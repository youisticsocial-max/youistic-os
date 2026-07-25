import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phone,
      company,
      website,
      service,
      source,
      goal,
      budget,
      timeline,
      scopingFeatures,
      scopingDesc,
      extraComments,
      referralCode,
    } = body;

    // Construct a detailed comment from the form data
    let detailedComment = `Goal: ${goal || "N/A"}\nBudget: ${budget || "N/A"}\nTimeline: ${timeline || "N/A"}`;
    if (scopingFeatures && scopingFeatures.length > 0) {
      detailedComment += `\nFeatures: ${scopingFeatures.join(", ")}`;
    }
    if (scopingDesc) {
      detailedComment += `\nScoping Notes: ${scopingDesc}`;
    }
    if (extraComments) {
      detailedComment += `\nExtra Comments: ${extraComments}`;
    }
    if (referralCode) {
      detailedComment += `\nReferral Code: ${referralCode}`;
    }

    // Insert into PostgreSQL
    const lead = await prisma.lead.create({
      data: {
        clientName: name,
        clientEmail: email || null,
        clientPhone: phone || null,
        businessName: company || null,
        service: service || null,
        source: website ? `Website (${website})` : source || "Website Lead Form",
        comment: detailedComment,
        status: "NEW", // Default status
      },
    });

    // Fire & forget webhook to n8n
    const WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || "http://localhost:5678/webhook/new-lead";
    fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "new_lead", data: lead }),
    }).catch((err) => console.error("Webhook notification failed:", err));

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 201 });
  } catch (error) {
    console.error("Lead API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to create lead" }, { status: 500 });
  }
}
