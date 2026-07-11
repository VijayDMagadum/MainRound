import { getSessionId } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    
    // Fetch user items
    let items = await prisma.checklistItem.findMany({
      where: { sessionId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });

    // If empty, auto-generate initial checklist items based on household details
    if (items.length === 0) {
      const profile = await prisma.householdProfile.findUnique({
        where: { sessionId }
      });
      
      const adults = profile?.adults || 1;
      const children = profile?.children || 0;
      const elders = profile?.olderAdults || 0;
      const totalPeople = adults + children + elders;
      const hasPets = profile?.pets || false;
      const hasMedicalNeeds = profile?.medicalPowerDependent || false;
      const hasVehicle = profile?.vehicleAvailable !== "none";

      const defaultItems = [
        {
          category: "water",
          title: "Drinking Water",
          description: "Clean water stored in closed containers (3 liters per person per day for 3 days).",
          quantity: `${totalPeople * 3 * 3} Liters`,
          isRequired: true,
        },
        {
          category: "food",
          title: "Non-Perishable Food",
          description: "Ready-to-eat foods like dry snacks, energy bars, biscuits, and roasted grains.",
          quantity: `${totalPeople * 3}-day supply`,
          isRequired: true,
        },
        {
          category: "medicine",
          title: "Essential Medicines & First Aid",
          description: "Prescription medications, pain relievers, bandages, sanitizers, and ORS packets.",
          quantity: "1 Kit",
          isRequired: true,
        },
        {
          category: "lighting",
          title: "Emergency Torch & Spare Batteries",
          description: "Check bulb functionality. Store in a known, reachable dry spot.",
          quantity: "2 Units",
          isRequired: true,
        },
        {
          category: "communication",
          title: "Power Banks & Emergency Radios",
          description: "Charge power banks to 100% capacity and preserve phone battery.",
          quantity: "1-2 Units",
          isRequired: true,
        },
        {
          category: "documents",
          title: "Waterproof Go-Bag for Documents",
          description: "Keep Aadhar/IDs, insurance files, house deeds, and liquid cash in a zipper lock pouch.",
          quantity: "1 Bag",
          isRequired: true,
        },
      ];

      if (hasPets) {
        defaultItems.push({
          category: "pets",
          title: "Pet Supplies",
          description: "Dry pet food, clean water bowls, identification tags, and pet leash.",
          quantity: "3-day supply",
          isRequired: false,
        });
      }

      if (hasMedicalNeeds) {
        defaultItems.push({
          category: "medicine",
          title: "Medical Equipment Power Backup",
          description: "Alternative power supply or backup cylinder/battery for life-safety equipment.",
          quantity: "1 Backup",
          isRequired: true,
        });
      }

      if (hasVehicle) {
        defaultItems.push({
          category: "vehicle",
          title: "Vehicle Preparation",
          description: "Verify fuel levels, parking location away from trees, and wiper condition.",
          quantity: "All vehicles",
          isRequired: false,
        });
      }

      // Bulk create items
      await prisma.checklistItem.createMany({
        data: defaultItems.map((item, index) => ({
          sessionId,
          ...item,
          position: index,
        })),
      });

      // Refetch
      items = await prisma.checklistItem.findMany({
        where: { sessionId },
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      });
    }

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("[API/Checklist/GET] Error fetching checklist:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();

    if (!body.title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // Get max position to append
    const lastItem = await prisma.checklistItem.findFirst({
      where: { sessionId },
      orderBy: { position: "desc" },
    });
    const nextPos = lastItem ? lastItem.position + 1 : 0;

    const newItem = await prisma.checklistItem.create({
      data: {
        sessionId,
        title: body.title,
        description: body.description || "",
        category: body.category || "custom",
        quantity: body.quantity || "",
        isRequired: body.isRequired !== false,
        isCompleted: false,
        isCustom: true,
        position: nextPos,
      },
    });

    return NextResponse.json(newItem);
  } catch (error: any) {
    console.error("[API/Checklist/POST] Error creating checklist item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    const updated = await prisma.checklistItem.updateMany({
      where: {
        id: body.id,
        sessionId, // ensure security context
      },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.isCompleted !== undefined && { isCompleted: body.isCompleted }),
        ...(body.quantity !== undefined && { quantity: body.quantity }),
        ...(body.position !== undefined && { position: body.position }),
      },
    });

    return NextResponse.json({ success: true, count: updated.count });
  } catch (error: any) {
    console.error("[API/Checklist/PATCH] Error updating checklist item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionId = await getSessionId();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const reset = searchParams.get("reset");

    if (reset === "true") {
      // Delete all checklist items to trigger default seeding on next GET
      await prisma.checklistItem.deleteMany({
        where: { sessionId },
      });
      return NextResponse.json({ success: true, message: "Checklist reset successfully." });
    }

    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    await prisma.checklistItem.delete({
      where: {
        id,
        sessionId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[API/Checklist/DELETE] Error deleting checklist item:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
