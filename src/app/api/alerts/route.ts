import { getSessionId } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { getClientKey, checkRateLimit, publicErrorResponse, rateLimitResponse } from "@/lib/security/api";
import { CitizenObservationSchema, sanitizeText } from "@/lib/security/input";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    
    const acknowledgedIds = new Set(acknowledgements.map((a: any) => a.alertId));

    return NextResponse.json({
      systemAlerts: systemAlerts.map((alert: any) => ({
        ...alert,
        acknowledged: acknowledgedIds.has(alert.id)
      })),
      observations
    });
  } catch (error: any) {
    console.error("[API/Alerts/GET] Error:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const rateLimit = checkRateLimit(getClientKey(req, "alerts:observation"), {
      limit: 30,
      windowMs: 10 * 60_000,
    });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

    const sessionId = await getSessionId();
    const body = await req.json();
    const parsed = CitizenObservationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid observation payload", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const observationInput = parsed.data;
    const observation = await prisma.userObservation.create({
      data: {
        sessionId,
        hazardType: observationInput.hazardType,
        severity: observationInput.severity,
        location: observationInput.location,
        latitude: observationInput.latitude,
        longitude: observationInput.longitude,
        description: observationInput.description,
      }
    });

    return NextResponse.json({ success: true, observation });
  } catch (error: any) {
    console.error("[API/Alerts/POST] Error creating observation:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}

// Acknowledge alert endpoint
export async function PATCH(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    const alertId = sanitizeText(body.alertId, 120);
    
    if (!alertId) {
      return NextResponse.json({ error: "alertId is required" }, { status: 400 });
    }

    const ack = await prisma.alertAcknowledgement.upsert({
      where: {
        sessionId_alertId: {
          sessionId,
          alertId
        }
      },
      update: {},
      create: {
        sessionId,
        alertId
      }
    });

    return NextResponse.json({ success: true, ack });
  } catch (error: any) {
    console.error("[API/Alerts/PATCH] Error acknowledging alert:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}
