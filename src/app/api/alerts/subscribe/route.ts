import { getSessionId } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { publicErrorResponse } from "@/lib/security/api";
import { sanitizeText } from "@/lib/security/input";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    const endpoint = sanitizeText(body.endpoint, 2048);
    const p256dh = sanitizeText(body.keys?.p256dh, 256);
    const auth = sanitizeText(body.keys?.auth, 256);

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "Invalid subscription details" }, { status: 400 });
    }

    try {
      const parsedEndpoint = new URL(endpoint);
      if (parsedEndpoint.protocol !== "https:") {
        return NextResponse.json({ error: "Push endpoint must use HTTPS" }, { status: 400 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid push endpoint URL" }, { status: 400 });
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        sessionId,
        p256dh,
        auth,
      },
      create: {
        sessionId,
        endpoint,
        p256dh,
        auth,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error("[API/Alerts/Subscribe] Error saving subscription:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = sanitizeText(searchParams.get("endpoint"), 2048);

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    return NextResponse.json({ success: true, message: "Subscription deleted successfully." });
  } catch (error: any) {
    console.error("[API/Alerts/Subscribe/DELETE] Error:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}
