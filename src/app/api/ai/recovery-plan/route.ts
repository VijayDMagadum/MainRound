import { buildUntrustedJsonContext } from "@/lib/ai/context";
import { callOpenRouter } from "@/lib/ai/openrouter";
import { parseAndValidate } from "@/lib/ai/response-parser";
import { RecoveryPlanResponseSchema } from "@/lib/ai/schemas";
import { RECOVERY_PLAN_PROMPT } from "@/lib/ai/system-prompts";
import { createAISafeProfile } from "@/lib/privacy/create-ai-safe-profile";
import { getClientKey, checkRateLimit, publicErrorResponse, rateLimitResponse } from "@/lib/security/api";
import { normalizeLocale, RecoveryObservationSchema } from "@/lib/security/input";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  observations: z.array(RecoveryObservationSchema).max(20),
  household: z.any().nullable(),
  locale: z.preprocess((value) => normalizeLocale(value), z.enum(["en", "hi", "mr"])).default("en"),
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("[API/AI/RecoveryPlan] Processing post-event recovery plan request");

  try {
    const rateLimit = checkRateLimit(getClientKey(req, "ai:recovery"), {
      limit: 12,
      windowMs: 60_000,
    });
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

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

    const contextText = buildUntrustedJsonContext({
      locale,
      householdProfile: safeProfile,
      observations,
      defaultIntent: observations.length > 0
        ? "Generate a recovery plan for the reported damage."
        : "Generate a standard post-storm cleanup and safety plan.",
    });

    const messages = [
      { role: "system" as const, content: RECOVERY_PLAN_PROMPT },
      { role: "user" as const, content: `Generate the recovery plan from this context:\n${contextText}` },
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
          { role: "user" as const, content: `Schema check failed: ${validationErr.message}. Output ONLY valid repaired JSON.` },
        ];

        const repairResponse = await callOpenRouter(repairMessages);
        const validatedRecovery = parseAndValidate(repairResponse, RecoveryPlanResponseSchema);
        return NextResponse.json(validatedRecovery);
      }
    } catch (aiErr: any) {
      console.error("[API/AI/RecoveryPlan] AI API call failed. Returning safety fallback.", aiErr.message);
      return NextResponse.json(generateDeterministicRecoveryFallback(observations));
    }
  } catch (error: any) {
    console.error("[API/AI/RecoveryPlan] Internal server handler error:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}

function generateDeterministicRecoveryFallback(observations: Array<{ hazardType: string }>) {
  const isFloodDamage = observations.some((obs) => obs.hazardType === "flooding" || obs.hazardType === "waterlogging");

  const cleanupTasks = [
    "Discard any food items that came into contact with floodwater.",
    "Throw away items that cannot be completely washed and disinfected, such as wet mattresses or carpets.",
    "Open windows and doors to circulate air and dry damp walls.",
    "Wash walls, floors, and hard surfaces with soap and clean water, followed by disinfectant.",
  ];

  if (isFloodDamage) {
    cleanupTasks.unshift("Remove accumulated silt or sludge carefully using protective rubber boots and gloves.");
  }

  return {
    title: "Safe Post-Monsoon Recovery Plan",
    summary: "This rules-based recovery plan uses reported damage observations and standard post-flood safety protocols.",
    immediateSafetyChecks: [
      "Check the exterior structure for cracking, soil erosion, or leaning walls before entering.",
      "If you smell gas or suspect a cylinder leak, leave immediately and contact emergency utilities.",
      "Watch for snakes, rodents, insects, or sharp objects that may be hidden in debris.",
    ],
    electricalSafety: [
      "Do not turn on lights or main switches if walls are damp or outlets were submerged.",
      "Have a qualified electrician inspect wiring, breaker boxes, and appliances before use.",
      "Keep feet dry and wear rubber-soled shoes when checking switches.",
    ],
    waterSafety: [
      "Assume tap water is unsafe until cleared by local health authorities.",
      "Use bottled water or boil tap water before drinking, brushing teeth, or preparing food.",
      "Empty, scrub, and sanitize overhead or underground water tanks if floodwater entered the building.",
    ],
    cleanupTasks,
    replenishSupplies: [
      "Restock first-aid supplies, antiseptic liquids, ORS, and insect repellent.",
      "Replace used batteries, matchboxes, dry rations, and emergency water.",
      "Buy mold-cleaning detergent, disinfectant, gloves, and garbage bags.",
    ],
    limitations: [
      "This recovery plan is informational and does not replace structural, electrical, or medical assessment.",
      "Never enter a building declared unsafe by municipal engineers or disaster authorities.",
    ],
  };
}
