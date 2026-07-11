import { callOpenRouter } from "@/lib/ai/openrouter";
import { parseAndValidate, extractJSON } from "@/lib/ai/response-parser";
import { PreparednessPlanResponseSchema } from "@/lib/ai/schemas";
import { PREPAREDNESS_PLAN_PROMPT } from "@/lib/ai/system-prompts";
import { createAISafeProfile } from "@/lib/privacy/create-ai-safe-profile";
import { calculateRisk } from "@/lib/weather/risk-engine";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  forecast: z.any().nullable(),
  household: z.any().nullable(),
  locale: z.string().default("en"),
});

export async function POST(req: NextRequest) {
  console.log("[API/AI/PreparednessPlan] Received generation request");
  
  try {
    const body = await req.json();
    const parsedRequest = RequestSchema.safeParse(body);
    
    if (!parsedRequest.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsedRequest.error.format() },
        { status: 400 }
      );
    }

    const { forecast, household, locale } = parsedRequest.data;
    
    // 1. Calculate deterministic risk
    const riskAssessment = calculateRisk(forecast, household);

    // 2. Prepare AI-Safe sanitized profile
    const safeProfile = createAISafeProfile(household);

    // 3. Setup context for the AI
    const contextText = `
    Language requested: ${locale}
    Household Profile Context:
    - Dwelling Type: ${safeProfile.dwellingType}
    - Floor Level: ${safeProfile.floorLevel}
    - Waterlogging Prone: ${safeProfile.waterloggingProne}
    - Near Hazard Source: ${safeProfile.nearHazardSource}
    - Has Upper Floor: ${safeProfile.hasUpperFloor}
    - Adults: ${safeProfile.adults}, Children: ${safeProfile.children}, Older Adults: ${safeProfile.olderAdults}
    - Pets: ${safeProfile.pets}
    - Accessibility Needs: ${safeProfile.accessibilityNeeds}
    - Medical Equipment Dependent: ${safeProfile.medicalPowerDependent}
    - Vehicle Available: ${safeProfile.vehicleAvailable}
    - Preferred Travel: ${safeProfile.preferredTravelMode}

    Risk Engine Assessment:
    - Overall Risk Level: ${riskAssessment.overall}
    - Heavy Rain: ${riskAssessment.heavyRain}
    - Flooding Risk: ${riskAssessment.flooding}
    - Thunderstorm Risk: ${riskAssessment.thunderstorm}
    - Wind Risk: ${riskAssessment.wind}
    - Visibility Risk: ${riskAssessment.visibility}
    - Power Disruption Risk: ${riskAssessment.powerDisruption}
    - Travel Risk: ${riskAssessment.travel}
    - Risk Reasons: ${riskAssessment.reasons.join(" | ")}
    `;

    const messages = [
      { role: "system" as const, content: PREPAREDNESS_PLAN_PROMPT },
      { role: "user" as const, content: `Generate the preparedness plan. Here is the context:\n${contextText}` },
    ];

    try {
      const aiResponse = await callOpenRouter(messages);
      
      try {
        const validatedPlan = parseAndValidate(aiResponse, PreparednessPlanResponseSchema);
        return NextResponse.json(validatedPlan);
      } catch (validationErr: any) {
        console.warn("[API/AI/PreparednessPlan] AI returned invalid JSON. Attempting one-time repair request.");
        
        // Retry once with a repair instruction
        const repairMessages = [
          ...messages,
          { role: "assistant" as const, content: aiResponse },
          { role: "user" as const, content: `Your previous response had a validation error: ${validationErr.message}. Please output ONLY the corrected JSON conforming exactly to the schema. Do not output any conversational wrapper.` }
        ];
        
        const repairResponse = await callOpenRouter(repairMessages);
        const validatedPlan = parseAndValidate(repairResponse, PreparednessPlanResponseSchema);
        return NextResponse.json(validatedPlan);
      }
    } catch (aiErr: any) {
      console.error("[API/AI/PreparednessPlan] AI client failed or timed out. Using deterministic fallback.", aiErr.message);
      
      // Use fallback
      const fallbackPlan = generateDeterministicPlanFallback(riskAssessment, safeProfile, locale);
      return NextResponse.json(fallbackPlan);
    }
  } catch (error: any) {
    console.error("[API/AI/PreparednessPlan] Internal handler error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// Deterministic fallback generator
function generateDeterministicPlanFallback(riskAssessment: any, profile: any, locale: string) {
  const isSevere = riskAssessment.overall === "severe";
  const isHigh = riskAssessment.overall === "high" || isSevere;

  const fallback = {
    title: locale === "hi" ? "मानसून तैयारी योजना (ऑफ़लाइन बैकअप)" : locale === "mr" ? "पावसाळा पूर्वतयारी योजना (ऑफलाईन बॅकअप)" : "Monsoon Preparedness Plan (Offline Backup)",
    summary: locale === "hi" 
      ? "एआई सहायता वर्तमान में अनुपलब्ध है। यह सुरक्षा योजना आपके इन-ऐप जोखिम के आधार पर तैयार की गई है।" 
      : locale === "mr" 
      ? "एआय सहाय्य सध्या अनुपलब्ध आहे. ही सुरक्षा योजना आपल्या इन-अॅप जोखमीवर आधारित तयार केली आहे."
      : "AI assistant is temporarily unavailable. This safety plan has been generated deterministically based on your profile and weather conditions.",
    riskSummary: {
      level: riskAssessment.overall,
      explanation: riskAssessment.reasons.join(" ") || "Standard monsoon conditions.",
      confidence: riskAssessment.confidence
    },
    immediateActions: [
      {
        id: "fb-imm-1",
        title: locale === "hi" ? "आपातकालीन पावर बैंक चार्ज करें" : locale === "mr" ? "तातडीने पॉवर बँक चार्ज करा" : "Charge Power Banks",
        description: "Charge all mobile phones, rechargeable lanterns, and backup batteries immediately.",
        priority: "critical" as const,
        timeframe: "Now",
        reason: "Heavy rainfall increases the risk of grid outages."
      },
      {
        id: "fb-imm-2",
        title: locale === "hi" ? "सुरक्षित पीने का पानी जमा करें" : locale === "mr" ? "पिण्याचे पाणी साठवून ठेवा" : "Store Drinking Water",
        description: "Ensure at least 3-4 liters of water per person per day is stored cleanly.",
        priority: "critical" as const,
        timeframe: "Now",
        reason: "Floodwaters can contaminate municipal water supplies."
      }
    ],
    nextSixHours: [
      {
        id: "fb-six-1",
        title: "Review Emergency Kit",
        description: "Stock dry food, necessary prescription medicines, and first-aid kits.",
        priority: "high" as const,
        timeframe: "Next 6 hours",
        reason: "Road waterlogging may prevent accessing pharmacies or markets later."
      }
    ],
    beforeRain: [
      {
        id: "fb-br-1",
        title: "Secure Roof and Balconies",
        description: "Move plants, loose items, and sheets to secure spots to avoid wind damage.",
        priority: "medium" as const,
        timeframe: "Before rain starts",
        reason: "Gusts can turn loose elements into dangerous flying projectiles."
      }
    ],
    homePreparation: [
      {
        id: "fb-home-1",
        title: "Clear Drainage Grates",
        description: "Clear leaves and trash blocking local pipes or household exit drains.",
        priority: "high" as const,
        timeframe: "Pre-rain",
        reason: "Clogged paths are the primary cause of local compound waterlogging."
      }
    ],
    familyCommunication: [
      {
        id: "fb-fam-1",
        title: "Confirm Contact Protocol",
        description: "Share offline family meeting spots and emergency phone lists.",
        priority: "high" as const,
        timeframe: "Now",
        reason: "Cellular network towers can lose signal during lightning storms."
      }
    ],
    supplies: [
      {
        id: "fb-sup-1",
        title: "Check Torches and Lanterns",
        description: "Verify batteries work and keep them in easy-to-reach locations.",
        priority: "medium" as const,
        timeframe: "Pre-event",
        reason: "Power failures can happen suddenly at night."
      }
    ],
    accessibility: profile.accessibilityNeeds ? [
      {
        id: "fb-acc-1",
        title: "Verify Accessibility Path",
        description: "Keep ramps clear and coordinate with neighbors/caregivers for evacuation help if required.",
        priority: "critical" as const,
        timeframe: "Immediate",
        reason: "Mobility challenges make prompt evacuations harder without advance planning."
      }
    ] : [],
    pets: profile.pets ? [
      {
        id: "fb-pet-1",
        title: "Pet Food and Safe Spot",
        description: "Store extra pet food dry. Make sure pets have collar identification tags and are indoors.",
        priority: "medium" as const,
        timeframe: "Now",
        reason: "Pets scare easily from thunder cracks and can flee."
      }
    ] : [],
    travel: [
      {
        id: "fb-trv-1",
        title: "Reconsider Travel Routes",
        description: "Avoid driving through low-lying subways or waterlogged flyovers.",
        priority: "high" as const,
        timeframe: "Commute",
        reason: "Engines stall easily in deep puddles."
      }
    ],
    evacuationReadiness: isHigh ? [
      {
        id: "fb-evac-1",
        title: "Prepare Go-Bag",
        description: "Pack identity documents, cash, medicines, values, and dry snacks in a waterproof zip bag.",
        priority: "critical" as const,
        timeframe: "Now",
        reason: "Low structures or flood-prone neighborhoods must be ready to move immediately if waters rise."
      }
    ] : [],
    avoid: [
      "Do not step into moving floodwaters or touch dangling cables.",
      "Do not take shelter under trees, banners, or weak metal scaffolds during lightning.",
      "Do not operate electrical appliances with wet hands."
    ],
    communityActions: [
      {
        id: "fb-comm-1",
        title: "Establish Society Check-in",
        description: "Coordinate with building guards to alert residents if basement water levels rise.",
        priority: "medium" as const,
        timeframe: "Ongoing",
        reason: "Early community warnings prevent parked cars from getting submerged."
      }
    ],
    afterEvent: [
      {
        id: "fb-aft-1",
        title: "Inspect Utilities Safely",
        description: "Wait until walls are dry to check main switches; boil drinking water to kill bacteria.",
        priority: "high" as const,
        timeframe: "Recovery",
        reason: "Contaminated municipal pipes can lead to water-borne diseases."
      }
    ],
    assumptions: [
      "Assumed household is located in the target forecast coordinates.",
      profile.medicalPowerDependent ? "Assumed critical medical dependancy requires backup power planning." : "Assumed standard power profile."
    ],
    dataLimitations: [
      "Fallback plan uses rules-based thresholds. It does not replace guidance from the National Disaster Management Authority (NDMA) or local municipal alerts."
    ]
  };

  return fallback;
}
