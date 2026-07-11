import { callOpenRouter } from "@/lib/ai/openrouter";
import { parseAndValidate } from "@/lib/ai/response-parser";
import { TravelAdvisoryResponseSchema } from "@/lib/ai/schemas";
import { TRAVEL_ADVISORY_PROMPT } from "@/lib/ai/system-prompts";
import { calculateRisk } from "@/lib/weather/risk-engine";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const RequestSchema = z.object({
  originWeather: z.any().nullable(),
  destinationWeather: z.any().nullable(),
  travelDetails: z.object({
    originName: z.string(),
    destinationName: z.string(),
    departureTime: z.string(),
    returnTime: z.string().optional(),
    travelMode: z.string(), // public, private, 2wheeler, etc.
    flexible: z.boolean().default(true),
    hasVulnerablePassengers: z.boolean().default(false),
  }),
  locale: z.string().default("en"),
});

export async function POST(req: NextRequest) {
  console.log("[API/AI/TravelAdvisory] Processing travel advisory request");
  
  try {
    const body = await req.json();
    const parsedRequest = RequestSchema.safeParse(body);
    
    if (!parsedRequest.success) {
      return NextResponse.json(
        { error: "Invalid request payload", details: parsedRequest.error.format() },
        { status: 400 }
      );
    }

    const { originWeather, destinationWeather, travelDetails, locale } = parsedRequest.data;
    
    // Calculate deterministic risks at origin & destination
    const originRisk = calculateRisk(originWeather);
    const destinationRisk = calculateRisk(destinationWeather);

    const contextText = `
    Language requested: ${locale}
    Route: ${travelDetails.originName} to ${travelDetails.destinationName}
    Mode of travel: ${travelDetails.travelMode}
    Flexible to postpone: ${travelDetails.flexible ? "Yes" : "No"}
    Vulnerable passengers: ${travelDetails.hasVulnerablePassengers ? "Yes" : "No"}

    Origin computed risk: ${originRisk.overall} (Reasons: ${originRisk.reasons.join(", ")})
    Destination computed risk: ${destinationRisk.overall} (Reasons: ${destinationRisk.reasons.join(", ")})
    `;

    const messages = [
      { role: "system" as const, content: TRAVEL_ADVISORY_PROMPT },
      { role: "user" as const, content: `Analyze the route and provide travel advisory. Context:\n${contextText}` },
    ];

    try {
      const aiResponse = await callOpenRouter(messages);
      
      try {
        const validatedAdvisory = parseAndValidate(aiResponse, TravelAdvisoryResponseSchema);
        return NextResponse.json(validatedAdvisory);
      } catch (validationErr: any) {
        console.warn("[API/AI/TravelAdvisory] AI response failed schema check. Retrying with repair prompt.");
        
        const repairMessages = [
          ...messages,
          { role: "assistant" as const, content: aiResponse },
          { role: "user" as const, content: `Schema check failed: ${validationErr.message}. Output ONLY the valid repaired JSON.` }
        ];

        const repairResponse = await callOpenRouter(repairMessages);
        const validatedAdvisory = parseAndValidate(repairResponse, TravelAdvisoryResponseSchema);
        return NextResponse.json(validatedAdvisory);
      }
    } catch (aiErr: any) {
      console.error("[API/AI/TravelAdvisory] AI API failed. Providing fallback advisory.", aiErr.message);
      const fallbackAdvisory = generateDeterministicTravelFallback(originRisk, destinationRisk, travelDetails, locale);
      return NextResponse.json(fallbackAdvisory);
    }
  } catch (error: any) {
    console.error("[API/AI/TravelAdvisory] Internal server handler error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// Generate fallback travel advisory based on calculated risks
function generateDeterministicTravelFallback(originRisk: any, destinationRisk: any, travelDetails: any, locale: string) {
  const isSevere = originRisk.overall === "severe" || destinationRisk.overall === "severe";
  const isHigh = originRisk.overall === "high" || destinationRisk.overall === "high" || isSevere;

  let recommendation: "proceed_with_caution" | "consider_postponing" | "avoid_non_essential_travel" = "proceed_with_caution";
  let summary = "The weather along the route looks relatively standard. Proceed with standard caution.";

  if (isSevere) {
    recommendation = "avoid_non_essential_travel";
    summary = "Severe monsoon risk levels estimated at points along your route. Highly recommend avoiding non-essential transit.";
  } else if (isHigh) {
    recommendation = "consider_postponing";
    summary = "High hazard risks detected. Consider postponing travel until conditions improve or heavy rain bands pass.";
  } else if (originRisk.overall === "moderate" || destinationRisk.overall === "moderate") {
    recommendation = "proceed_with_caution";
    summary = "Moderate weather hazards detected. Commute with increased vigilance.";
  }

  const reasons = [
    `Origin risk level is estimated as ${originRisk.overall.toUpperCase()}.`,
    `Destination risk level is estimated as ${destinationRisk.overall.toUpperCase()}.`,
  ];
  if (travelDetails.hasVulnerablePassengers) {
    reasons.push("Commute includes children, elderly, or individuals with mobility constraints, increasing hazard vulnerability.");
  }
  if (travelDetails.travelMode === "2wheeler" && isHigh) {
    reasons.push("Two-wheeler transit is highly exposed to heavy rainfall and wind skidding.");
  }

  return {
    recommendation,
    summary,
    riskLevel: isSevere ? "severe" as const : isHigh ? "high" as const : originRisk.overall === "moderate" || destinationRisk.overall === "moderate" ? "moderate" as const : "low" as const,
    reasons,
    departureConditions: [
      `Weather conditions at departure location are assessed as: ${originRisk.reasons.join(". ") || "Standard"}`
    ],
    destinationConditions: [
      `Weather conditions at destination are assessed as: ${destinationRisk.reasons.join(". ") || "Standard"}`
    ],
    saferTimeWindows: [
      {
        start: "After 6 hours",
        end: "Tomorrow afternoon",
        explanation: "Check the local forecast radar before departure; rainfall bands typically have localized break periods."
      }
    ],
    preparation: [
      "Verify vehicle wipers, tires, and brake pads are functional.",
      "Charge cell phones to 100% and keep an offline list of road helpline numbers.",
      "Pack dry food, water, and essential medicines in the vehicle."
    ],
    ifStranded: [
      "If water rises around the vehicle, turn off the engine, abandon the vehicle immediately, and seek higher ground.",
      "Never walk or drive into moving water channels.",
      "Tune into local radio channels or watch NDMA updates for shelter directions."
    ],
    limitations: [
      "This advisory is based on weather forecasts and app-estimated risk.",
      "It does not include verified live road, traffic, rail, or aviation disruption data unless such a data source is explicitly connected."
    ]
  };
}
