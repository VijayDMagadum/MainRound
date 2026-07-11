import { getSessionId } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { publicErrorResponse } from "@/lib/security/api";
import { sanitizeText } from "@/lib/security/input";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const locations = await prisma.savedLocation.findMany({
      where: { sessionId },
      orderBy: { isPrimary: "desc" },
    });
    
    return NextResponse.json(locations);
  } catch (error: any) {
    console.error("[API/Locations/GET] Error:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    const name = sanitizeText(body.name, 120);
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);

    if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "name, latitude, and longitude are required" }, { status: 400 });
    }

    // If setting a new primary location, unset any existing primary location
    if (body.isPrimary === true) {
      await prisma.savedLocation.updateMany({
        where: { sessionId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const location = await prisma.savedLocation.create({
      data: {
        sessionId,
        name,
        latitude,
        longitude,
        isPrimary: !!body.isPrimary,
      },
    });

    return NextResponse.json(location);
  } catch (error: any) {
    console.error("[API/Locations/POST] Error creating location:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
    }

    await prisma.savedLocation.delete({
      where: {
        id,
        sessionId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API/Locations/DELETE] Error:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}
