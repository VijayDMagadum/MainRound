import { getSessionId } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();

    if (!body.endpoint || !body.keys || !body.keys.p256dh || !body.keys.auth) {
      return NextResponse.json({ error: "Invalid subscription details" }, { status: 400 });
    }

    const { endpoint, keys } = body;

    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        sessionId,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        sessionId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    return NextResponse.json({ success: true, subscription });
  } catch (error: any) {
    console.error("[API/Alerts/Subscribe] Error saving subscription:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint");

    if (!endpoint) {
      return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });

    return NextResponse.json({ success: true, message: "Subscription deleted successfully." });
  } catch (error: any) {
    console.error("[API/Alerts/Subscribe/DELETE] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
