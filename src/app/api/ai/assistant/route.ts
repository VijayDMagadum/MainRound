import { buildUntrustedJsonContext } from "@/lib/ai/context";
import { callOpenRouter } from "@/lib/ai/openrouter";
import { parseAndValidate } from "@/lib/ai/response-parser";
import { AssistantResponseSchema } from "@/lib/ai/schemas";
import { ASSISTANT_PROMPT } from "@/lib/ai/system-prompts";
import { createAISafeProfile } from "@/lib/privacy/create-ai-safe-profile";
import { getClientKey, checkRateLimit, publicErrorResponse, rateLimitResponse } from "@/lib/security/api";
import { AIQuestionSchema, AssistantHistorySchema, normalizeLocale } from "@/lib/security/input";
import { calculateRisk } from "@/lib/weather/risk-engine";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  question: AIQuestionSchema,
  history: AssistantHistorySchema,
  forecast: z.any().nullable(),
  household: z.any().nullable(),
  locale: z.preprocess((value) => normalizeLocale(value), z.enum(["en", "hi", "mr"])).default("en"),
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("[API/AI/Assistant] Processing conversation request");

  try {
    const rateLimit = checkRateLimit(getClientKey(req, "ai:assistant"), {
      limit: 20,
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

    const { question, history, forecast, household, locale } = parsedRequest.data;
    const riskAssessment = calculateRisk(forecast, household);
    const safeProfile = createAISafeProfile(household);

    const contextText = buildUntrustedJsonContext({
      locale,
      question,
      householdProfile: safeProfile,
      riskAssessment: {
        overall: riskAssessment.overall,
        travel: riskAssessment.travel,
        powerDisruption: riskAssessment.powerDisruption,
        flooding: riskAssessment.flooding,
        reasons: riskAssessment.reasons,
        recommendedActions: riskAssessment.recommendedActions,
      },
    });

    const messages = [
      { role: "system" as const, content: ASSISTANT_PROMPT },
      ...history.slice(-6),
      { role: "user" as const, content: contextText },
    ];

    try {
      const aiResponse = await callOpenRouter(messages);

      try {
        const validatedResponse = parseAndValidate(aiResponse, AssistantResponseSchema);
        return NextResponse.json(validatedResponse);
      } catch (validationErr: any) {
        console.warn("[API/AI/Assistant] Assistant response failed schema validation. Requesting correction.");

        const repairMessages = [
          ...messages,
          { role: "assistant" as const, content: aiResponse },
          { role: "user" as const, content: `Schema check failed: ${validationErr.message}. Output ONLY valid repaired JSON.` },
        ];

        const repairResponse = await callOpenRouter(repairMessages);
        const validatedResponse = parseAndValidate(repairResponse, AssistantResponseSchema);
        return NextResponse.json(validatedResponse);
      }
    } catch (aiErr: any) {
      console.error("[API/AI/Assistant] AI service failed. Falling back to rules-based advice.", aiErr.message);
      return NextResponse.json(generateDeterministicAssistantFallback(question, riskAssessment, safeProfile));
    }
  } catch (error: any) {
    console.error("[API/AI/Assistant] Internal handler error:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}

function generateDeterministicAssistantFallback(question: string, riskAssessment: any, profile: any) {
  const query = question.toLowerCase();
  const suggestedFollowUps = [
    "What should be in my emergency bag?",
    "What should I do during a power outage?",
    "How can I clean my house after flooding?",
    "Is it safe to drive right now?",
  ];

  const warning = riskAssessment.overall === "severe" || riskAssessment.overall === "high"
    ? "ALERT: High or severe weather risks are estimated for your area. Follow instructions from local disaster teams."
    : undefined;

  let answer: string;

  if (query.includes("bag") || query.includes("checklist") || query.includes("supply")) {
    const people = Math.max(1, profile.adults + profile.children + profile.olderAdults);
    answer = [
      "### Emergency Go-Bag Checklist",
      `Pack for at least ${people} household member${people === 1 ? "" : "s"}.`,
      "1. Documents: IDs, insurance files, emergency cash, and prescriptions in a waterproof pouch.",
      "2. First aid: antiseptic, bandages, ORS, and 7-10 days of personal medicines.",
      "3. Power: charged power banks, torch, spare batteries, and charging cables.",
      `4. Food and water: ${people * 3 * 3} liters of water plus dry ready-to-eat food for 72 hours.`,
      "5. Hygiene: sanitizer, soap, wet wipes, sanitary products, and garbage bags.",
    ].join("\n");
  } else if (query.includes("power") || query.includes("outage") || query.includes("electricity")) {
    answer = [
      "### Power Outage Action Guide",
      "- Put phones on low-power mode and preserve battery for emergency calls.",
      "- Unplug major appliances to reduce surge damage when power returns.",
      "- Use torches or LED lanterns instead of open flames where possible.",
      "- If powered medical equipment is needed, move early to a generator-backed location or pre-arranged caregiver support.",
    ].join("\n");
  } else if (query.includes("clean") || query.includes("flood") || query.includes("house")) {
    answer = [
      "### Post-Flooding Safe Cleanup",
      "1. Do not touch switches or sockets until electrical points are dry and inspected.",
      "2. Wear rubber gloves and sturdy boots before entering flood-affected rooms.",
      "3. Discard food, medicines, cosmetics, mattresses, and porous carpets touched by floodwater.",
      "4. Wash hard surfaces with soap and clean water, then disinfect to reduce mold and infection risk.",
    ].join("\n");
  } else if (query.includes("travel") || query.includes("drive") || query.includes("road")) {
    const status = riskAssessment.travel === "severe" || riskAssessment.travel === "high"
      ? "highly hazardous. Postpone non-essential travel."
      : "manageable with caution. Recheck conditions before leaving.";

    answer = [
      "### Route Travel Advisory",
      `Estimated travel risk: ${riskAssessment.travel.toUpperCase()}.`,
      `Transit is currently ${status}`,
      "- Avoid underpasses, waterlogged flyovers, and roads with hidden potholes.",
      "- Do not walk or drive through moving water.",
      "- Watch for tree branches, loose boards, and dangling wires.",
    ].join("\n");
  } else {
    answer = [
      "### Monsoon Safety Guidance",
      "The AI provider is unavailable, so this rules-based answer uses your app risk assessment.",
      `Overall risk level: ${riskAssessment.overall.toUpperCase()}.`,
      `Key warnings: ${riskAssessment.reasons.join(". ") || "Standard seasonal weather."}`,
      "",
      "Immediate actions:",
      ...riskAssessment.recommendedActions.map((action: string) => `- ${action}`),
    ].join("\n");
  }

  return {
    answer,
    warning,
    suggestedFollowUps,
  };
}
