import { getSessionId } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const sessionId = await getSessionId();

    const fullSessionData = await prisma.userSession.findUnique({
      where: { id: sessionId },
      include: {
        profile: true,
        locations: true,
        checklistItems: true,
        preparednessPlan: true,
        preparednessTasks: true,
        userObservations: true,
        alertAcknowledgements: true,
        emergencyContacts: true,
        communityPlan: true,
        travelAdvisories: true,
      },
    });

    if (!fullSessionData) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Clean sensitive field references if any
    return NextResponse.json(fullSessionData);
  } catch (error: any) {
    console.error("[API/Profile/Export] Error exporting data:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
