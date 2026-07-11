import { callOpenRouter } from "@/lib/ai/openrouter";
import { parseAndValidate } from "@/lib/ai/response-parser";
import { AssistantResponseSchema } from "@/lib/ai/schemas";
import { ASSISTANT_PROMPT } from "@/lib/ai/system-prompts";
import { createAISafeProfile } from "@/lib/privacy/create-ai-safe-profile";
import { calculateRisk } from "@/lib/weather/risk-engine";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  question: z.string(),
  history: z.array(
    z.object({
      role: z.enum(["system", "user", "assistant"]),
      content: z.string(),
    })
  ).default([]),
  forecast: z.any().nullable(),
  household: z.any().nullable(),
  locale: z.string().default("en"),
});

export async function POST(req: NextRequest) {
  console.log("[API/AI/Assistant] Processing conversation request");
  
  try {
    const body = await req.json();
    const parsedRequest = RequestSchema.safeParse(body);
    
    if (!parsedRequest.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsedRequest.error.format() },
        { status: 400 }
      );
    }

    const { question, history, forecast, household, locale } = parsedRequest.data;
    
    // Calculate risks and sanitize profile
    const riskAssessment = calculateRisk(forecast, household);
    const safeProfile = createAISafeProfile(household);

    const contextText = `
    Language requested: ${locale}
    Household Profile: Dwelling: ${safeProfile.dwellingType}, Floor: ${safeProfile.floorLevel}, Waterlogging Prone: ${safeProfile.waterloggingProne}, Pets: ${safeProfile.pets}, Dependants: (Children: ${safeProfile.children}, Older: ${safeProfile.olderAdults}), Medical Power Dependent: ${safeProfile.medicalPowerDependent}
    
    Risk Level: ${riskAssessment.overall}
    Hazards reasons: ${riskAssessment.reasons.join(" | ")}

    User question: ${question}
    `;

    // Construct history with system prompt
    const messages = [
      { role: "system" as const, content: ASSISTANT_PROMPT },
      ...history.slice(-6), // Send last 6 messages to keep context window light and clean
      { role: "user" as const, content: contextText }
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
          { role: "user" as const, content: `Your previous response failed Zod schema check: ${validationErr.message}. Output ONLY valid repaired JSON.` }
        ];

        const repairResponse = await callOpenRouter(repairMessages);
        const validatedResponse = parseAndValidate(repairResponse, AssistantResponseSchema);
        return NextResponse.json(validatedResponse);
      }
    } catch (aiErr: any) {
      console.error("[API/AI/Assistant] AI service failed. Falling back to rules-based advice.", aiErr.message);
      const fallbackResponse = generateDeterministicAssistantFallback(question, riskAssessment, safeProfile, locale);
      return NextResponse.json(fallbackResponse);
    }
  } catch (error: any) {
    console.error("[API/AI/Assistant] Internal handler error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// Simple rules-based conversational fallback
function generateDeterministicAssistantFallback(question: string, riskAssessment: any, profile: any, locale: string) {
  const query = question.toLowerCase();
  let answer = "";
  let warning: string | undefined = undefined;
  const suggestedFollowUps = [
    "What should be in my emergency bag?",
    "What should I do during a power outage?",
    "How can I clean my house after flooding?",
    "Is it safe to drive right now?"
  ];

  if (riskAssessment.overall === "severe" || riskAssessment.overall === "high") {
    warning = locale === "hi" 
      ? "चेतावनी: आपके स्थान पर भारी मानसून जोखिम अनुमानित है। बाहरी यात्रा से बचें।" 
      : locale === "mr"
      ? "इशारा: आपल्या भागात जास्त पूर / वादळ धोका आहे. प्रवास करणे टाळा."
      : "ALERT: High/Severe weather risks detected in your area. Follow instruction from local disaster teams.";
  }

  if (query.includes("bag") || query.includes("checklist") || query.includes("supply") || query.includes("सामग्री")) {
    answer = `
### Emergency Go-Bag Checklist
Since the AI assistant is running in fallback mode, here is a list of essential items to pack immediately:
1. **Documents**: Identification cards, property insurance files, and cash sealed in a waterproof plastic pouch.
2. **First-Aid**: Antiseptic creams, bandages, and at least 7-10 days of personal prescription medications.
3. **Power**: Fully charged power banks, a working torch (flashlight), and fresh spare batteries.
4. **Food & Water**: 3 liters of clean drinking water per person and non-perishable food (dry fruits, energy bars, biscuits).
5. **Hygiene**: Wet wipes, sanitizers, and basic sanitary products.
    `;
  } else if (query.includes("power") || query.includes("outage") || query.includes("electricity") || query.includes("बिजली")) {
    answer = `
### Power Outage Action Guide
In case of power failures during storms:
- **Save Battery**: Set mobile phones to 'Low Power Mode' and avoid unnecessary calls.
- **Unplug Devices**: Unplug major appliances (refrigerators, ACs, TVs) to prevent damage from voltage surges when power returns.
- **Lighting**: Use LED torches or candles. Place candles on stable, non-flammable surfaces away from curtains.
- **Medical Equipment**: If a household member is dependent on powered medical equipment, immediately contact your pre-arranged backup help or move to a community shelter with generator backups.
    `;
  } else if (query.includes("clean") || query.includes("flood") || query.includes("house") || query.includes("बाढ़") || query.includes("पूर")) {
    answer = `
### Post-Flooding Safe Cleanup
If floodwaters entered your home:
1. **Electricity First**: Do not flip switches or touch plug sockets until an electrician has certified the walls and circuits are dry.
2. **Safety Gear**: Wear thick rubber gloves and sturdy boots to protect against bacteria and injuries from hidden objects.
3. **Discard Contaminated Items**: Throw out any food, medicines, or cosmetics that touched floodwater. Discard porous items like mattresses or fiber carpets.
4. **Disinfect**: Clean all walls, solid floors, and metal furniture with a bleach-based solution to prevent toxic mold growth.
    `;
  } else if (query.includes("travel") || query.includes("drive") || query.includes("road") || query.includes("यात्रा") || query.includes("प्रवास")) {
    const status = riskAssessment.travel === "severe" || riskAssessment.travel === "high"
      ? "highly hazardous. Please postpone travel."
      : "moderately safe. Travel with extreme vigilance.";
    
    answer = `
### Route Travel Advisory
Your estimated travel risk is **${riskAssessment.travel.toUpperCase()}**.
Transit is currently **${status}**

Key precautions:
- Do not drive or walk through stagnant pools; 15cm (6 inches) of water can cause car engine stalling or loss of steering control.
- Avoid underpasses and flyovers which accumulate run-off.
- Watch out for tree branches, weak boards, and dangling wires.
    `;
  } else {
    answer = `
### Monsoon Safety Guidance (AI Offline)
Hello! I am operating in fallback mode because the OpenRouter service is currently unreachable.

Based on your local weather and profile details:
- **Overall Risk Level**: ${riskAssessment.overall.toUpperCase()}
- **Key Warnings**: ${riskAssessment.reasons.join(". ") || "Standard seasonal weather."}

**Immediate Actions Recommended:**
${riskAssessment.recommendedActions.map((act: string) => `- ${act}`).join("\n")}

Feel free to ask about emergency checklists, power outage safety, travel planning, or home cleaning.
    `;
  }

  return {
    answer,
    warning,
    suggestedFollowUps
  };
}
