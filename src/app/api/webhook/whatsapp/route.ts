import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET Handler: Handles Meta WhatsApp Webhook verification challenge during setup.
 * Meta sends hub.mode, hub.verify_token, and hub.challenge.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "youistic_whatsapp_secret_token_2026";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WhatsApp Webhook] Verification challenge passed successfully.");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[WhatsApp Webhook] Verification failed. Invalid verify token or hub.mode.");
  return NextResponse.json(
    { error: "Forbidden: Verify token mismatch or invalid request mode." },
    { status: 403 }
  );
}

/**
 * POST Handler: Handles incoming WhatsApp messages from clients in real-time.
 * Saves new leads directly into CEO & SDR Lead Pipeline in PostgreSQL/Prisma.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.object === "whatsapp_business_account") {
      const entries = body.entry || [];

      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (!value || !value.messages || value.messages.length === 0) {
            continue;
          }

          const contacts = value.contacts || [];

          for (const message of value.messages) {
            const senderPhone = message.from;
            const messageType = message.type;

            // Extract contact display name if provided by WhatsApp
            const contact = contacts.find((c: { wa_id: string }) => c.wa_id === senderPhone);
            const senderName = contact?.profile?.name || `WhatsApp Lead (${senderPhone})`;

            // Parse text content depending on message type
            let messageBody = "";
            if (messageType === "text") {
              messageBody = message.text?.body || "";
            } else if (messageType === "interactive") {
              const interactive = message.interactive;
              messageBody =
                interactive?.button_reply?.title ||
                interactive?.list_reply?.title ||
                "[Interactive Response]";
            } else if (messageType === "button") {
              messageBody = message.button?.text || "[Button Click]";
            } else {
              messageBody = `[Media/Attachment: ${messageType}]`;
            }

            console.log(
              `[WhatsApp Inbound] From: ${senderName} (${senderPhone}) | Message: "${messageBody}"`
            );

            // Automatically create Lead in CEO/SDR ERP pipeline
            try {
              const lead = await prisma.lead.create({
                data: {
                  clientName: senderName,
                  clientPhone: senderPhone,
                  source: "WhatsApp Inbound Agent",
                  service: "Business Automation / Web / Mobile App",
                  comment: `Incoming WA Message:\n${messageBody}`,
                  status: "NEW",
                },
              });

              console.log(`[WhatsApp Webhook] Lead successfully created in ERP database (ID: ${lead.id})`);

              // Notify downstream automation / AI agent if webhook configured
              const AGENT_WEBHOOK_URL = process.env.AI_AGENT_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
              if (AGENT_WEBHOOK_URL) {
                fetch(AGENT_WEBHOOK_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    event: "whatsapp_inbound_lead",
                    leadId: lead.id,
                    senderPhone,
                    senderName,
                    message: messageBody,
                    rawMessage: message,
                  }),
                }).catch((err) =>
                  console.error("[WhatsApp Webhook] Downstream agent notify error:", err)
                );
              }
            } catch (dbError) {
              console.error("[WhatsApp Webhook] Error saving lead to database:", dbError);
            }
          }
        }
      }
    }

    // Always respond 200 OK to Meta to acknowledge event receipt
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook] Webhook processing error:", error);
    return NextResponse.json({ status: "EVENT_RECEIVED" }, { status: 200 });
  }
}
