import { buildUntrustedJsonContext } from "@/lib/ai/context";
import { callOpenRouter } from "@/lib/ai/openrouter";
import { generateDeterministicPlanFallback } from "@/lib/ai/preparedness-fallback";
import { parseAndValidate } from "@/lib/ai/response-parser";
import { PreparednessPlanResponseSchema } from "@/lib/ai/schemas";
import { PREPAREDNESS_PLAN_PROMPT } from "@/lib/ai/system-prompts";
import { createAISafeProfile } from "@/lib/privacy/create-ai-safe-profile";
import { getClientKey, checkRateLimit, publicErrorResponse, rateLimitResponse } from "@/lib/security/api";
import { normalizeLocale } from "@/lib/security/input";
import { calculateRisk } from "@/lib/weather/risk-engine";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  forecast: z.any().nullable(),
  household: z.any().nullable(),
  locale: z.preprocess((value) => normalizeLocale(value), z.enum(["en", "hi", "mr"])).default("en"),
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  console.log("[API/AI/PreparednessPlan] Received generation request");

  try {
    const rateLimit = checkRateLimit(getClientKey(req, "ai:preparedness"), {
      limit: 10,
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

    const { forecast, household, locale } = parsedRequest.data;
    const riskAssessment = calculateRisk(forecast, household);
    const safeProfile = createAISafeProfile(household);

    const contextText = buildUntrustedJsonContext({
      locale,
      householdProfile: safeProfile,
      riskAssessment: {
        overall: riskAssessment.overall,
        heavyRain: riskAssessment.heavyRain,
        flooding: riskAssessment.flooding,
        thunderstorm: riskAssessment.thunderstorm,
        wind: riskAssessment.wind,
        visibility: riskAssessment.visibility,
        powerDisruption: riskAssessment.powerDisruption,
        travel: riskAssessment.travel,
        reasons: riskAssessment.reasons,
        recommendedActions: riskAssessment.recommendedActions,
        confidence: riskAssessment.confidence,
      },
    });

    const messages = [
      { role: "system" as const, content: PREPAREDNESS_PLAN_PROMPT },
      { role: "user" as const, content: `Generate the preparedness plan from this context:\n${contextText}` },
    ];

    try {
      const aiResponse = await callOpenRouter(messages);

      try {
        const validatedPlan = parseAndValidate(aiResponse, PreparednessPlanResponseSchema);
        return NextResponse.json(validatedPlan);
      } catch (validationErr: any) {
        console.warn("[API/AI/PreparednessPlan] AI returned invalid JSON. Attempting one-time repair request.");

        const repairMessages = [
          ...messages,
          { role: "assistant" as const, content: aiResponse },
          {
            role: "user" as const,
            content: `Your previous response had a validation error: ${validationErr.message}. Output ONLY corrected JSON conforming exactly to the schema.`,
          },
        ];

        const repairResponse = await callOpenRouter(repairMessages);
        const validatedPlan = parseAndValidate(repairResponse, PreparednessPlanResponseSchema);
        return NextResponse.json(validatedPlan);
      }
    } catch (aiErr: any) {
      console.error("[API/AI/PreparednessPlan] AI client failed or timed out. Using deterministic fallback.", aiErr.message);
      return NextResponse.json(generateDeterministicPlanFallback(riskAssessment, safeProfile, locale));
    }
  } catch (error: any) {
    console.error("[API/AI/PreparednessPlan] Internal handler error:", error);
    return publicErrorResponse("Internal Server Error", 500, error);
  }
}
