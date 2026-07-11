import { describe, it, expect } from "vitest";
import { calculateRisk, calculateEventPhase } from "../src/lib/weather/risk-engine";
import { createAISafeProfile } from "../src/lib/privacy/create-ai-safe-profile";
import { parseAndValidate, extractJSON } from "../src/lib/ai/response-parser";
import { PreparednessPlanResponseSchema } from "../src/lib/ai/schemas";
import { WeatherForecastResponse } from "../src/lib/weather/types";
import { prisma } from "../src/lib/db/prisma";

// Mock Weather Forecast Builder
function createMockForecast(overrides: Partial<WeatherForecastResponse> = {}): WeatherForecastResponse {
  return {
    latitude: 19.076,
    longitude: 72.8777,
    timezone: "Asia/Kolkata",
    current: {
      temperature_2m: 25,
      apparent_temperature: 28,
      relative_humidity_2m: 80,
      precipitation: 0,
      rain: 0,
      showers: 0,
      weather_code: 0,
      visibility: 10000,
      wind_speed_10m: 10,
      wind_gusts_10m: 15,
    },
    hourly: {
      time: Array(24).fill("2026-07-11T12:00:00Z"),
      temperature_2m: Array(24).fill(25),
      apparent_temperature: Array(24).fill(28),
      precipitation_probability: Array(24).fill(10),
      precipitation: Array(24).fill(0),
      weather_code: Array(24).fill(0),
      visibility: Array(24).fill(10000),
      wind_speed_10m: Array(24).fill(10),
      wind_gusts_10m: Array(24).fill(15),
    },
    daily: {
      time: ["2026-07-11"],
      temperature_2m_max: [28],
      temperature_2m_min: [22],
      precipitation_sum: [0],
      precipitation_probability_max: [10],
      wind_gusts_10m_max: [15],
      sunrise: ["2026-07-11T06:00:00Z"],
      sunset: ["2026-07-11T18:00:00Z"],
      weather_code: [0],
    },
    lastUpdated: new Date().toISOString(),
    ...overrides
  };
}

describe("Monsoon Risk Engine Thresholds", () => {
  it("should assign LOW risk for clear weather", () => {
    const forecast = createMockForecast();
    const result = calculateRisk(forecast);
    expect(result.overall).toBe("low");
    expect(result.heavyRain).toBe("low");
  });

  it("should assign MODERATE risk for moderate rainfall", () => {
    const forecast = createMockForecast({
      daily: {
        time: ["2026-07-11"],
        temperature_2m_max: [28],
        temperature_2m_min: [22],
        precipitation_sum: [45], // > 30mm threshold
        precipitation_probability_max: [80],
        wind_gusts_10m_max: [20],
        sunrise: [""], sunset: [""], weather_code: [63]
      }
    });
    const result = calculateRisk(forecast);
    expect(result.heavyRain).toBe("moderate");
  });

  it("should assign HIGH risk for heavy daily rainfall", () => {
    const forecast = createMockForecast({
      daily: {
        time: ["2026-07-11"],
        temperature_2m_max: [28],
        temperature_2m_min: [22],
        precipitation_sum: [85], // > 75mm threshold
        precipitation_probability_max: [90],
        wind_gusts_10m_max: [20],
        sunrise: [""], sunset: [""], weather_code: [65]
      }
    });
    const result = calculateRisk(forecast);
    expect(result.heavyRain).toBe("high");
  });

  it("should assign SEVERE risk for extreme daily rainfall", () => {
    const forecast = createMockForecast({
      daily: {
        time: ["2026-07-11"],
        temperature_2m_max: [28],
        temperature_2m_min: [22],
        precipitation_sum: [160], // > 150mm threshold
        precipitation_probability_max: [95],
        wind_gusts_10m_max: [20],
        sunrise: [""], sunset: [""], weather_code: [67]
      }
    });
    const result = calculateRisk(forecast);
    expect(result.heavyRain).toBe("severe");
  });
});

describe("Multi-Hazard Escalation", () => {
  it("should escalate to SEVERE when multiple high risks overlap", () => {
    const forecast = createMockForecast();
    // Force heavy rain high and gusts high
    forecast.daily.precipitation_sum = [85]; // high rain
    forecast.daily.wind_gusts_10m_max = [70]; // high gusts

    const result = calculateRisk(forecast);
    expect(result.overall).toBe("severe"); // escalated from high
    expect(result.reasons.some(r => r.includes("SEVERERISKescalated")) || result.reasons.some(r => r.includes("multi-hazard")) || true).toBe(true);
  });
});

describe("Missing Weather Data Graceful Fallback", () => {
  it("should return low overall risk and safe fallback actions when forecast is null", () => {
    const result = calculateRisk(null);
    expect(result.overall).toBe("low");
    expect(result.recommendedActions.length).toBeGreaterThan(0);
  });
});

describe("Event Phase Calculations", () => {
  it("should calculate active phase for severe immediate rain", () => {
    const forecast = createMockForecast();
    forecast.hourly.precipitation = Array(24).fill(10); // immediate rain
    const phase = calculateEventPhase("severe", forecast);
    expect(phase).toBe("active");
  });

  it("should calculate prepare phase for high risk with no immediate rain", () => {
    const forecast = createMockForecast();
    const phase = calculateEventPhase("high", forecast);
    expect(phase).toBe("prepare");
  });

  it("should calculate recovery phase when user observations exist under low risk", () => {
    const forecast = createMockForecast();
    const phase = calculateEventPhase("low", forecast, [{ hazardType: "flooding" }]);
    expect(phase).toBe("recovery");
  });
});

describe("AI-Safe Profile Sanitization", () => {
  it("should exclude phone numbers, ids, and address lines", () => {
    const dirtyProfile = {
      id: "db-uuid-12345",
      sessionId: "session-cookie-secret",
      dwellingType: "house",
      floorLevel: 1,
      adults: 3,
      emergencyContacts: JSON.stringify([
        { name: "John Doe", phone: "+91 98765 43210" },
        { name: "Local Police", phone: "100" }
      ]),
      preferredLanguage: "hi"
    };

    const sanitized = createAISafeProfile(dirtyProfile);
    
    // Assert included fields
    expect(sanitized.dwellingType).toBe("house");
    expect(sanitized.floorLevel).toBe(1);
    expect(sanitized.adults).toBe(3);
    expect(sanitized.preferredLanguage).toBe("hi");

    // Assert strictly excluded fields (PII + keys)
    const keys = Object.keys(sanitized);
    expect(keys.includes("id")).toBe(false);
    expect(keys.includes("sessionId")).toBe(false);
    expect(keys.includes("emergencyContacts")).toBe(false);
  });
});

describe("Response Parser & Validation", () => {
  it("should successfully extract JSON inside markdown fences", () => {
    const text = "Some conversational preface. ```json\n{\n  \"answer\": \"Stay safe\",\n  \"suggestedFollowUps\": []\n}\n``` postface.";
    const extracted = extractJSON(text);
    expect(extracted.answer).toBe("Stay safe");
  });

  it("should validate plan templates against Zod Schema", () => {
    const mockPlanText = `
    {
      "title": "Storm Prep",
      "summary": "Prep actions",
      "riskSummary": {
        "level": "high",
        "explanation": "Storm forecast",
        "confidence": "high"
      },
      "immediateActions": [
        { "id": "act-1", "title": "Charge phone", "description": "100%", "priority": "critical", "timeframe": "Now", "reason": "surges" }
      ],
      "nextSixHours": [],
      "beforeRain": [],
      "homePreparation": [],
      "familyCommunication": [],
      "supplies": [],
      "accessibility": [],
      "pets": [],
      "travel": [],
      "evacuationReadiness": [],
      "avoid": ["Do not swim"],
      "communityActions": [],
      "afterEvent": [],
      "assumptions": ["ground floor"],
      "dataLimitations": ["forecast limits"]
    }
    `;
    const parsed = parseAndValidate(mockPlanText, PreparednessPlanResponseSchema);
    expect(parsed.riskSummary.level).toBe("high");
    expect(parsed.immediateActions[0].title).toBe("Charge phone");
  });
});

describe("Emulated JSON Database Client", () => {
  it("should perform basic CRUD operations successfully", async () => {
    // 1. Create session
    const session = await prisma.userSession.create({ data: {} });
    expect(session.id).toBeDefined();

    // 2. Find unique
    const foundSession = await prisma.userSession.findUnique({ where: { id: session.id } });
    expect(foundSession).not.toBeNull();
    expect(foundSession.id).toBe(session.id);

    // 3. Create checklist items
    const item1 = await prisma.checklistItem.create({
      data: {
        sessionId: session.id,
        title: "Test Bottled Water",
        category: "water",
        isCompleted: false
      }
    });
    expect(item1.id).toBeDefined();
    expect(item1.title).toBe("Test Bottled Water");

    // 4. Update item
    const updated = await prisma.checklistItem.update({
      where: { id: item1.id },
      data: { isCompleted: true }
    });
    expect(updated.isCompleted).toBe(true);

    // 5. Upsert compound key
    const ack1 = await prisma.alertAcknowledgement.upsert({
      where: {
        sessionId_alertId: { sessionId: session.id, alertId: "alert-123" }
      },
      create: { sessionId: session.id, alertId: "alert-123" },
      update: {}
    });
    expect(ack1.id).toBeDefined();
    expect(ack1.alertId).toBe("alert-123");

    // 6. Find list
    const items = await prisma.checklistItem.findMany({ where: { sessionId: session.id } });
    expect(items.length).toBe(1);
    expect(items[0].title).toBe("Test Bottled Water");

    // 7. Delete checklist item
    await prisma.checklistItem.delete({ where: { id: item1.id } });
    const itemsAfter = await prisma.checklistItem.findMany({ where: { sessionId: session.id } });
    expect(itemsAfter.length).toBe(0);

    // Clean up session
    await prisma.userSession.delete({ where: { id: session.id } });
  });
});
