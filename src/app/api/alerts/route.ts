import { getSessionId } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    
    // Fetch global system alerts (calculated by risk engine or official warnings)
    const systemAlerts = await prisma.alert.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    // Fetch citizen observations
    const observations = await prisma.userObservation.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    // Fetch user acknowledgements
    const acknowledgements = await prisma.alertAcknowledgement.findMany({
      where: { sessionId }
    });
    
    const acknowledgedIds = new Set(acknowledgements.map(a => a.alertId));

    return NextResponse.json({
      systemAlerts: systemAlerts.map(alert => ({
        ...alert,
        acknowledged: acknowledgedIds.has(alert.id)
      })),
      observations
    });
  } catch (error: any) {
    console.error("[API/Alerts/GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();

    if (!body.hazardType || !body.severity || !body.location) {
      return NextResponse.json({ error: "hazardType, severity, and location are required" }, { status: 400 });
    }

    const observation = await prisma.userObservation.create({
      data: {
        sessionId,
        hazardType: body.hazardType,
        severity: body.severity,
        location: body.location,
        latitude: body.latitude ? parseFloat(body.latitude) : null,
        longitude: body.longitude ? parseFloat(body.longitude) : null,
        description: body.description || "",
      }
    });

    return NextResponse.json({ success: true, observation });
  } catch (error: any) {
    console.error("[API/Alerts/POST] Error creating observation:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}

// Acknowledge alert endpoint
export async function PATCH(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    
    if (!body.alertId) {
      return NextResponse.json({ error: "alertId is required" }, { status: 400 });
    }

    const ack = await prisma.alertAcknowledgement.upsert({
      where: {
        sessionId_alertId: {
          sessionId,
          alertId: body.alertId
        }
      },
      update: {},
      create: {
        sessionId,
        alertId: body.alertId
      }
    });

    return NextResponse.json({ success: true, ack });
  } catch (error: any) {
    console.error("[API/Alerts/PATCH] Error acknowledging alert:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
