import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { headers } from "next/headers";
import type { WebhookEvent } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function syncUser(event: WebhookEvent) {
  const { id } = event.data;

  if (!id) return;

  switch (event.type) {
    case "user.created":
    case "user.updated": {
      const data = event.data;
      const email =
        data.email_addresses?.find((e) => e.id === data.primary_email_address_id)
          ?.email_address || data.email_addresses?.[0]?.email_address || "";

      await prisma.users.upsert({
        where: { id },
        update: {
          email,
          name: data.first_name
            ? `${data.first_name} ${data.last_name || ""}`.trim()
            : null,
          fullName: data.first_name
            ? `${data.first_name} ${data.last_name || ""}`.trim()
            : null,
          avatarUrl: data.image_url || null,
        },
        create: {
          id,
          email,
          passwordHash: "",
          name: data.first_name
            ? `${data.first_name} ${data.last_name || ""}`.trim()
            : null,
          fullName: data.first_name
            ? `${data.first_name} ${data.last_name || ""}`.trim()
            : null,
          avatarUrl: data.image_url || null,
        },
      });
      break;
    }

    case "user.deleted": {
      await prisma.users.delete({ where: { id } }).catch(() => {});
      break;
    }
  }
}

export async function POST(request: NextRequest) {
  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: WebhookEvent;
  try {
    const wh = new Webhook(secret);
    const payload = await request.clone().text();
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent;
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  try {
    await syncUser(event);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Clerk webhook sync error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
