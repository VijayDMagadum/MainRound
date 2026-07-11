import { getSessionId, clearSession } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { publicErrorResponse } from "@/lib/security/api";
import { sanitizeHouseholdProfileInput } from "@/lib/security/input";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const profile = await prisma.householdProfile.findUnique({
      where: { sessionId },
    });
    
    return NextResponse.json(profile || null);
  } catch (error: any) {
    console.error("[API/Profile/GET] Error:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    const profileData = sanitizeHouseholdProfileInput(body);

    const profile = await prisma.householdProfile.upsert({
      where: { sessionId },
      update: profileData,
      create: {
        sessionId,
        ...profileData,
      },
    });

    return NextResponse.json(profile);
  } catch (error: any) {
    console.error("[API/Profile/POST] Error saving profile:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}

// CASCADE DELETE - Wipes all user data
export async function DELETE(req: NextRequest) {
  try {
    // Delete session from DB (Prisma cascade delete will remove profile, locations, tasks, checklists)
    await clearSession();
    return NextResponse.json({ success: true, message: "All local and server-side session data deleted successfully." });
  } catch (error: any) {
    console.error("[API/Profile/DELETE] Error deleting session data:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}
