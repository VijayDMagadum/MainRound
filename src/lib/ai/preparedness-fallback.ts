import { PreparednessPlanResponse, ActionItem } from "./schemas";
import { SafeHouseholdProfile } from "@/lib/privacy/create-ai-safe-profile";
import { MonsoonRiskAssessment } from "@/lib/weather/types";

function action(
  id: string,
  title: string,
  description: string,
  priority: ActionItem["priority"],
  timeframe: string,
  reason: string
): ActionItem {
  return { id, title, description, priority, timeframe, reason };
}

function totalPeople(profile: SafeHouseholdProfile) {
  return Math.max(1, profile.adults + profile.children + profile.olderAdults);
}

export function generateDeterministicPlanFallback(
  riskAssessment: MonsoonRiskAssessment,
  profile: SafeHouseholdProfile,
  locale: string
): PreparednessPlanResponse {
  const people = totalPeople(profile);
  const isHighOrSevere = riskAssessment.overall === "high" || riskAssessment.overall === "severe";

  return {
    title: "Monsoon Preparedness Plan",
    summary: [
      "This rules-based backup plan covers before, during, and after severe weather.",
      `It is tailored for ${people} household member${people === 1 ? "" : "s"} and current app-estimated ${riskAssessment.overall} risk.`,
    ].join(" "),
    riskSummary: {
      level: riskAssessment.overall,
      explanation: riskAssessment.reasons.join(" ") || "Standard monsoon readiness conditions.",
      confidence: riskAssessment.confidence,
    },
    immediateActions: [
      action(
        "fb-imm-1",
        "Charge phones and power banks",
        "Charge all phones, rechargeable lanterns, emergency radios, and backup batteries.",
        "critical",
        "Now",
        "Storms can cause sudden grid outages and network disruption."
      ),
      action(
        "fb-imm-2",
        "Store clean drinking water",
        `Store at least ${people * 3 * 3} liters of clean water for a 72-hour household reserve.`,
        "critical",
        "Now",
        "Floodwater can contaminate municipal supply and delay tanker access."
      ),
    ],
    nextSixHours: [
      action(
        "fb-six-1",
        "Confirm medicines and first aid",
        "Keep prescription medicines, ORS, antiseptic, bandages, and basic fever medication in a dry pouch.",
        "high",
        "Next 6 hours",
        "Waterlogging can block pharmacy access."
      ),
      action(
        "fb-six-2",
        "Write an offline contact card",
        "Write family numbers, society guard numbers, local helplines, and meeting point details on paper.",
        "high",
        "Next 6 hours",
        "Phones may run out of battery or lose connectivity."
      ),
    ],
    beforeRain: [
      action(
        "fb-before-1",
        "Clear drains and balcony outlets",
        "Remove leaves, plastic, and debris from household drains, terrace outlets, and balcony channels.",
        "high",
        "Before heavy rain",
        "Small blockages are a common cause of avoidable indoor seepage."
      ),
      action(
        "fb-before-2",
        "Secure loose outdoor objects",
        "Move plants, boards, chairs, and metal sheets indoors or tie them securely.",
        "medium",
        "Before strong winds",
        "Loose items can injure people or damage windows during gusts."
      ),
    ],
    homePreparation: [
      action(
        "fb-home-1",
        "Protect documents and valuables",
        "Move IDs, property papers, cash, chargers, and medicines into a waterproof go-bag.",
        "high",
        "Pre-event",
        "A portable waterproof kit reduces loss if evacuation becomes necessary."
      ),
    ],
    familyCommunication: [
      action(
        "fb-family-1",
        "Assign family roles",
        "Decide who checks supplies, who contacts relatives, who watches children or older adults, and who monitors alerts.",
        "medium",
        "Pre-event",
        "Clear roles reduce confusion during rapidly changing weather."
      ),
    ],
    supplies: [
      action(
        "fb-supply-1",
        "Prepare dry food reserve",
        `Keep ready-to-eat food for at least ${people * 3} person-days, plus extra if markets are likely to close.`,
        "high",
        "Pre-event",
        "Waterlogged roads often interrupt food delivery and shop access."
      ),
      action(
        "fb-supply-2",
        "Keep hygiene supplies dry",
        "Pack sanitizer, sanitary products, soap, garbage bags, and wet wipes in sealed bags.",
        "medium",
        "Pre-event",
        "Good hygiene reduces illness risk during and after flooding."
      ),
    ],
    accessibility: profile.accessibilityNeeds || profile.medicalPowerDependent
      ? [
          action(
            "fb-access-1",
            "Arrange backup caregiver and power support",
            "Confirm a neighbor, caregiver, or society volunteer who can help with stairs, transport, or generator access.",
            "critical",
            "Now",
            "Medical and mobility needs require earlier action than general household planning."
          ),
        ]
      : [],
    pets: profile.pets
      ? [
          action(
            "fb-pet-1",
            "Prepare pet food and ID",
            "Keep pet food dry, attach identification, and move pets indoors before thunder begins.",
            "medium",
            "Pre-event",
            "Pets can panic during thunder and escape through open doors."
          ),
        ]
      : [],
    travel: [
      action(
        "fb-travel-1",
        "Avoid flooded underpasses",
        "Do not drive, bike, or walk through waterlogged underpasses, fast-moving water, or roads with hidden potholes.",
        isHighOrSevere ? "critical" : "high",
        "During rain",
        "Even shallow water can stall vehicles or hide open drains."
      ),
    ],
    evacuationReadiness: isHighOrSevere
      ? [
          action(
            "fb-evac-1",
            "Keep go-bag at the exit",
            "Place documents, medicines, water, snacks, flashlight, and phone charger near the safest exit route.",
            "critical",
            "Now",
            "High monsoon risk can require quick movement to a safer floor or shelter."
          ),
        ]
      : [],
    avoid: [
      "Do not touch dangling wires, wet switches, or metal gates during lightning or flooding.",
      "Do not walk or drive through moving floodwater.",
      "Do not shelter under trees, weak hoardings, or exposed scaffolding during storms.",
      "Do not spread unverified alert messages; use official or clearly sourced updates.",
    ],
    communityActions: [
      action(
        "fb-community-1",
        "Start a society check-in loop",
        "Ask building guards or volunteers to track basement water, lift shutdowns, vulnerable residents, and blocked exits.",
        "medium",
        "Before and during rain",
        "Community coordination improves early warning and evacuation support."
      ),
    ],
    afterEvent: [
      action(
        "fb-after-1",
        "Inspect electricity before use",
        "Wait for walls, sockets, and appliances to dry; use a qualified electrician if water entered electrical points.",
        "critical",
        "After rain stops",
        "Post-flood electrocution risk remains even after water levels recede."
      ),
      action(
        "fb-after-2",
        "Boil or use bottled water",
        "Use bottled water or boil tap water before drinking until local authorities confirm supply safety.",
        "high",
        "Recovery",
        "Floodwater can contaminate drinking-water lines."
      ),
    ],
    assumptions: [
      `Language requested: ${locale}.`,
      "Plan is based on app-estimated weather risk and household vulnerability, not verified municipal incident data.",
    ],
    dataLimitations: [
      "This is safety guidance, not an official government alert. Follow local disaster management, police, fire, and municipal instructions.",
    ],
  };
}
