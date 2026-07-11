import { getSessionId, clearSession } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const profile = await prisma.householdProfile.findUnique({
      where: { sessionId },
    });
    
    return NextResponse.json(profile || null);
  } catch (error: any) {
    console.error("[API/Profile/GET] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    
    const profileData = {
      dwellingType: body.dwellingType || "apartment",
      floorLevel: parseInt(body.floorLevel || "0"),
      waterloggingProne: !!body.waterloggingProne,
      nearHazardSource: !!body.nearHazardSource,
      hasUpperFloor: !!body.hasUpperFloor,
      adults: parseInt(body.adults || "1"),
      children: parseInt(body.children || "0"),
      olderAdults: parseInt(body.olderAdults || "0"),
      pets: !!body.pets,
      accessibilityNeeds: !!body.accessibilityNeeds,
      medicalPowerDependent: !!body.medicalPowerDependent,
      vehicleAvailable: body.vehicleAvailable || "none",
      preferredTravelMode: body.preferredTravelMode || "public",
      emergencyContacts: typeof body.emergencyContacts === "string" 
        ? body.emergencyContacts 
        : JSON.stringify(body.emergencyContacts || []),
      preferredLanguage: body.preferredLanguage || "en",
    };

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
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
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
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
