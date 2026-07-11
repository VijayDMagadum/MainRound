import { callOpenRouter } from "@/lib/ai/openrouter";
import { parseAndValidate } from "@/lib/ai/response-parser";
import { RecoveryPlanResponseSchema } from "@/lib/ai/schemas";
import { RECOVERY_PLAN_PROMPT } from "@/lib/ai/system-prompts";
import { createAISafeProfile } from "@/lib/privacy/create-ai-safe-profile";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  observations: z.array(
    z.object({
      hazardType: z.string(),
      severity: z.string(),
      description: z.string(),
    })
  ),
  household: z.any().nullable(),
  locale: z.string().default("en"),
});

export async function POST(req: NextRequest) {
  console.log("[API/AI/RecoveryPlan] Processing post-event recovery plan request");
  
  try {
    const body = await req.json();
    const parsedRequest = RequestSchema.safeParse(body);
    
    if (!parsedRequest.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsedRequest.error.format() },
        { status: 400 }
      );
    }

    const { observations, household, locale } = parsedRequest.data;
    
    const safeProfile = createAISafeProfile(household);

    const contextText = `
    Language requested: ${locale}
    Household Profile: Dwelling Type: ${safeProfile.dwellingType}, Floor Level: ${safeProfile.floorLevel}, Dependants (Adults: ${safeProfile.adults}, Children: ${safeProfile.children}, Elderly: ${safeProfile.olderAdults}), Medical Power Dependent: ${safeProfile.medicalPowerDependent ? "Yes" : "No"}
    
    User-Reported Damage Observations:
    ${observations.length > 0
      ? observations.map(obs => `- ${obs.hazardType} (${obs.severity}): ${obs.description}`).join("\n")
      : "No severe structural damage reported; standard post-storm cleanup requested."}
    `;

    const messages = [
      { role: "system" as const, content: RECOVERY_PLAN_PROMPT },
      { role: "user" as const, content: `Generate the recovery plan. Context:\n${contextText}` },
    ];

    try {
      const aiResponse = await callOpenRouter(messages);
      
      try {
        const validatedRecovery = parseAndValidate(aiResponse, RecoveryPlanResponseSchema);
        return NextResponse.json(validatedRecovery);
      } catch (validationErr: any) {
        console.warn("[API/AI/RecoveryPlan] AI recovery response failed schema check. Retrying with repair instruction.");
        
        const repairMessages = [
          ...messages,
          { role: "assistant" as const, content: aiResponse },
          { role: "user" as const, content: `Schema check failed: ${validationErr.message}. Output ONLY valid repaired JSON.` }
        ];

        const repairResponse = await callOpenRouter(repairMessages);
        const validatedRecovery = parseAndValidate(repairResponse, RecoveryPlanResponseSchema);
        return NextResponse.json(validatedRecovery);
      }
    } catch (aiErr: any) {
      console.error("[API/AI/RecoveryPlan] AI API call failed. Returning safety fallback.", aiErr.message);
      const fallbackRecovery = generateDeterministicRecoveryFallback(observations, safeProfile, locale);
      return NextResponse.json(fallbackRecovery);
    }
  } catch (error: any) {
    console.error("[API/AI/RecoveryPlan] Internal server handler error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// Generate fallback recovery plan
function generateDeterministicRecoveryFallback(observations: any[], profile: any, locale: string) {
  const isFloodDamage = observations.some(obs => obs.hazardType === "flooding" || obs.hazardType === "waterlogging");
  const isPowerDamage = observations.some(obs => obs.hazardType === "power_outage");

  const cleanupTasks = [
    "Discard any food items that came into contact with floodwater.",
    "Throw away items that cannot be completely washed and disinfected (e.g. wet mattresses, carpets).",
    "Open all windows and doors to let fresh air circulate and dry out damp walls.",
    "Wash walls, floors, and hard surfaces with soap and clean water, followed by a disinfectant."
  ];

  if (isFloodDamage) {
    cleanupTasks.unshift("Remove accumulated silt or sludge carefully using protective rubber boots and gloves.");
  }

  return {
    title: locale === "hi" ? "सुरक्षित पोस्ट-मानसून रिकवरी योजना" : locale === "mr" ? "सुरक्षित पोस्ट-पावसाळा रिकव्हरी योजना" : "Safe Post-Monsoon Recovery Plan",
    summary: "This plan has been generated deterministically using safety protocols based on your local observations.",
    immediateSafetyChecks: [
      "Check the exterior structure of your building for cracking, soil erosion, or leaning walls before entering.",
      "If you smell gas or suspect a gas cylinder leak, leave the premises immediately and contact emergency utilities.",
      "Watch out for snakes, rodents, or stinging insects that may have taken refuge inside your dwelling."
    ],
    electricalSafety: [
      "Do NOT turn on any lights or main switches if the walls are damp or if outlets were submerged under water.",
      "Have a certified electrician inspect and clear all wiring, breaker boxes, and appliances before powering them back on.",
      "Ensure your feet are dry and you are wearing rubber-soled shoes when checking switches."
    ],
    waterSafety: [
      "Assume tap water is contaminated until cleared by local health authorities.",
      "Use bottled water for drinking, brushing teeth, washing dishes, and food preparation, or boil tap water for at least 15-20 minutes.",
      "Empty, scrub, and sanitize overhead and underground building water tanks."
    ],
    cleanupTasks,
    replenishSupplies: [
      "Restock first-aid supplies, antiseptic liquids, and insect repellents.",
      "Replace used batteries, matchboxes, and emergency dry rations.",
      "Purchase mold-cleaning detergents and basic disinfectants."
    ],
    limitations: [
      "This recovery plan is an informational checklist. It does not replace professional structural, electrical, or medical assessments.",
      "Never enter a building that has been declared unsafe by municipal engineers."
    ]
  };
}
