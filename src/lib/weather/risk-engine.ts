import { RISK_THRESHOLDS } from "./risk-config";
import { MonsoonRiskAssessment, RiskLevel, WeatherForecastResponse, EventPhase } from "./types";

// Helper to determine the higher of two risk levels
export function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  const ranks: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2, severe: 3 };
  return ranks[a] >= ranks[b] ? a : b;
}

// Convert severity rank back to label
function rankToRisk(rank: number): RiskLevel {
  if (rank >= 3) return "severe";
  if (rank === 2) return "high";
  if (rank === 1) return "moderate";
  return "low";
}

function riskToRank(risk: RiskLevel): number {
  const ranks: Record<RiskLevel, number> = { low: 0, moderate: 1, high: 2, severe: 3 };
  return ranks[risk];
}

interface HouseholdRiskContext {
  dwellingType?: string;
  floorLevel?: number;
  waterloggingProne?: boolean;
  nearHazardSource?: boolean;
  hasUpperFloor?: boolean;
  medicalPowerDependent?: boolean;
  preferredTravelMode?: string;
}

export function calculateRisk(
  forecast: WeatherForecastResponse | null,
  household: HouseholdRiskContext | null = null,
  userObservations: Array<{ hazardType: string; severity: string }> = []
): MonsoonRiskAssessment {
  const reasons: string[] = [];
  const recommendedActions: string[] = [];

  // Default low assessment if no forecast data is available
  const defaultAssessment: MonsoonRiskAssessment = {
    overall: "low",
    heavyRain: "low",
    flooding: "low",
    thunderstorm: "low",
    wind: "low",
    visibility: "low",
    travel: "low",
    powerDisruption: "low",
    reasons: ["No weather forecast data available. Showing default safety precautions."],
    recommendedActions: [
      "Keep standard emergency contacts saved offline.",
      "Monitor local news channels and weather websites.",
    ],
    validFrom: new Date().toISOString(),
    validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    confidence: "low",
  };

  if (!forecast) {
    return defaultAssessment;
  }

  // 1. Calculate Heavy Rain Risk
  let rainRisk: RiskLevel = "low";
  const maxHourlyRain = forecast.hourly.precipitation.length > 0
    ? Math.max(...forecast.hourly.precipitation)
    : 0;
  const maxDailyRain = forecast.daily.precipitation_sum.length > 0
    ? Math.max(...forecast.daily.precipitation_sum)
    : 0;

  if (maxDailyRain >= RISK_THRESHOLDS.RAIN_DAILY.SEVERE || maxHourlyRain >= RISK_THRESHOLDS.RAIN_HOURLY.SEVERE) {
    rainRisk = "severe";
    reasons.push(`Severe rainfall forecast: up to ${maxDailyRain.toFixed(1)}mm daily or ${maxHourlyRain.toFixed(1)}mm/hour.`);
  } else if (maxDailyRain >= RISK_THRESHOLDS.RAIN_DAILY.HIGH || maxHourlyRain >= RISK_THRESHOLDS.RAIN_HOURLY.HIGH) {
    rainRisk = "high";
    reasons.push(`Heavy rainfall forecast: up to ${maxDailyRain.toFixed(1)}mm daily or ${maxHourlyRain.toFixed(1)}mm/hour.`);
  } else if (maxDailyRain >= RISK_THRESHOLDS.RAIN_DAILY.MODERATE || maxHourlyRain >= RISK_THRESHOLDS.RAIN_HOURLY.MODERATE) {
    rainRisk = "moderate";
    reasons.push(`Moderate rainfall forecast: up to ${maxDailyRain.toFixed(1)}mm daily.`);
  }

  // 2. Calculate Thunderstorm Risk
  let stormRisk: RiskLevel = "low";
  const hourlyCodes = forecast.hourly.weather_code;
  const hasSevereStorm = hourlyCodes.some(code => RISK_THRESHOLDS.CODES.THUNDERSTORM_SEVERE.includes(code));
  const hasModStorm = hourlyCodes.some(code => RISK_THRESHOLDS.CODES.THUNDERSTORM_MODERATE.includes(code));

  if (hasSevereStorm) {
    stormRisk = "severe";
    reasons.push("Severe thunderstorms with risk of lightning and hail are forecast.");
  } else if (hasModStorm) {
    stormRisk = "high";
    reasons.push("Moderate thunderstorms with lightning are expected.");
  } else if (hourlyCodes.some(c => c >= 80 && c <= 82)) {
    stormRisk = "moderate";
    reasons.push("Passing rain showers with possible lightning.");
  }

  // 3. Calculate Wind Risk
  let windRisk: RiskLevel = "low";
  const maxGust = forecast.daily.wind_gusts_10m_max.length > 0
    ? Math.max(...forecast.daily.wind_gusts_10m_max)
    : 0;

  if (maxGust >= RISK_THRESHOLDS.WIND_GUST.SEVERE) {
    windRisk = "severe";
    reasons.push(`Dangerous wind gusts forecast up to ${maxGust.toFixed(0)} km/h.`);
  } else if (maxGust >= RISK_THRESHOLDS.WIND_GUST.HIGH) {
    windRisk = "high";
    reasons.push(`High wind gusts forecast up to ${maxGust.toFixed(0)} km/h.`);
  } else if (maxGust >= RISK_THRESHOLDS.WIND_GUST.MODERATE) {
    windRisk = "moderate";
    reasons.push(`Moderate wind gusts up to ${maxGust.toFixed(0)} km/h.`);
  }

  // 4. Calculate Visibility Risk
  let visibilityRisk: RiskLevel = "low";
  const minVisibility = forecast.hourly.visibility.length > 0
    ? Math.min(...forecast.hourly.visibility)
    : 10000; // default clear

  if (minVisibility <= RISK_THRESHOLDS.VISIBILITY.SEVERE) {
    visibilityRisk = "severe";
    reasons.push("Severely restricted visibility (less than 500 meters) during heavy downpours.");
  } else if (minVisibility <= RISK_THRESHOLDS.VISIBILITY.HIGH) {
    visibilityRisk = "high";
    reasons.push("Low visibility (under 2 km) expected during rain spells.");
  } else if (minVisibility <= RISK_THRESHOLDS.VISIBILITY.MODERATE) {
    visibilityRisk = "moderate";
    reasons.push("Moderately reduced visibility in rain.");
  }

  // 5. Calculate Flooding Risk (factors in household profile and citizen observations)
  let floodingRisk: RiskLevel = rainRisk;

  // Household vulnerabilities increase flooding risk
  if (household) {
    let vulnerabilityScore = 0;
    if (household.waterloggingProne) {
      vulnerabilityScore += 2;
      reasons.push("Household profile indicates location is prone to waterlogging.");
    }
    if (household.nearHazardSource) {
      vulnerabilityScore += 1;
      reasons.push("Location is situated near a river, open drain, coastal region, or slope.");
    }
    if (household.dwellingType === "temporary" || household.dwellingType === "informal") {
      vulnerabilityScore += 2;
      reasons.push("Dwelling structure (informal/temporary) is highly vulnerable to heavy run-off.");
    } else if (household.floorLevel === 0 && !household.hasUpperFloor) {
      vulnerabilityScore += 1;
      reasons.push("Ground-floor residence without access to a safe upper level increases flooding risk.");
    }

    if (vulnerabilityScore >= 3 && floodingRisk !== "low") {
      floodingRisk = maxRisk(floodingRisk, "severe");
    } else if (vulnerabilityScore >= 1 && floodingRisk !== "low") {
      floodingRisk = maxRisk(floodingRisk, "high");
    }
  }

  // User observations in active mode can force flooding risk high/severe
  const activeFloodingObs = userObservations.filter(obs => obs.hazardType === "flooding" || obs.hazardType === "waterlogging");
  if (activeFloodingObs.length > 0) {
    const highestObsSeverity = activeFloodingObs.some(o => o.severity === "severe") ? "severe" : "high";
    floodingRisk = maxRisk(floodingRisk, highestObsSeverity as RiskLevel);
    reasons.push("Active citizen reports confirm local waterlogging/flooding in this area.");
  }

  // 6. Calculate Power Disruption Risk
  let powerRisk: RiskLevel = "low";
  if (windRisk === "severe" || stormRisk === "severe" || floodingRisk === "severe") {
    powerRisk = "severe";
    reasons.push("Critical risk of power outages due to severe storms, high winds, or flooded grids.");
  } else if (windRisk === "high" || stormRisk === "high" || floodingRisk === "high") {
    powerRisk = "high";
    reasons.push("High probability of electrical and grid disruptions.");
  } else if (windRisk === "moderate" || stormRisk === "moderate" || floodingRisk === "moderate") {
    powerRisk = "moderate";
    reasons.push("Possible brief power disruptions.");
  }

  // Escalation if household is dependent on powered medical equipment
  if (household?.medicalPowerDependent && (powerRisk === "moderate" || powerRisk === "high")) {
    powerRisk = maxRisk(powerRisk, "high");
    reasons.push("Critical vulnerability: Household depends on electricity for medical/accessibility equipment.");
  }

  // 7. Calculate Travel Risk
  let travelRisk: RiskLevel = "low";
  if (floodingRisk === "severe" || windRisk === "severe" || visibilityRisk === "severe") {
    travelRisk = "severe";
    reasons.push("Extremely hazardous travel conditions. Severe risks of waterlogging, blockages, or zero visibility.");
  } else if (floodingRisk === "high" || rainRisk === "high" || windRisk === "high" || visibilityRisk === "high") {
    travelRisk = "high";
    reasons.push("Difficult travel conditions. High risk of traffic waterlogging and slow transits.");
  } else if (floodingRisk === "moderate" || rainRisk === "moderate" || windRisk === "moderate" || visibilityRisk === "moderate") {
    travelRisk = "moderate";
    reasons.push("Drive with caution. Roads may have minor water accumulations.");
  }

  // Factor in user travel modes
  if (household?.preferredTravelMode === "2wheeler" && travelRisk !== "low") {
    travelRisk = maxRisk(travelRisk, "high");
    reasons.push("Two-wheeler transit increases risk of slipping or getting stranded during storms.");
  }

  // 8. Determine Overall Risk (and apply Multi-hazard escalation)
  let overallRisk = maxRisk(
    maxRisk(maxRisk(rainRisk, stormRisk), maxRisk(windRisk, floodingRisk)),
    maxRisk(travelRisk, powerRisk)
  );

  // Multi-hazard logic:
  // - Escalates to High if 3 or more moderate risk items overlap
  // - Escalates to Severe if 2 or more high risk items overlap
  const risksList = [rainRisk, stormRisk, windRisk, floodingRisk, travelRisk, powerRisk];
  const moderatesCount = risksList.filter(r => r === "moderate").length;
  const highsCount = risksList.filter(r => r === "high").length;

  if (highsCount >= 2 && overallRisk === "high") {
    overallRisk = "severe";
    reasons.push("Risk escalated to SEVERE due to multiple overlapping high-level hazards (e.g. wind, storm, rain).");
  } else if (moderatesCount >= 3 && overallRisk === "moderate") {
    overallRisk = "high";
    reasons.push("Risk escalated to HIGH due to concurrent moderate hazards occurring together.");
  }

  // Generate recommended actions based on computed levels
  if (overallRisk === "severe") {
    recommendedActions.push(
      "Avoid all non-essential outdoor travel immediately.",
      "Move to higher floor or safe dry structure if ground floor flooding is imminent.",
      "Keep all emergency power banks charged; run critical appliances only.",
      "Secure and store clean drinking water to last at least 72 hours.",
      "Stay away from open windows, metal gates, and electrical poles.",
      "Do NOT walk, drive, or swim through moving water or flooded pathways.",
      "Closely monitor instructions from local disaster authorities."
    );
  } else if (overallRisk === "high") {
    recommendedActions.push(
      "Reconsider non-essential travel or postpone commutes.",
      "Clear drainage outlets around the house and secure loose rooftop items.",
      "Charge primary mobile phones, power banks, and torches.",
      "Verify emergency bags and stock up on dry snacks and essential medications.",
      "Avoid waterlogged lanes and do not park vehicles under weak structures or trees.",
      "Check on vulnerable neighbors, older relatives, or pets."
    );
  } else if (overallRisk === "moderate") {
    recommendedActions.push(
      "Carry rain gear (umbrellas/raincoats) when traveling outside.",
      "Check vehicle brakes, wipers, and lights.",
      "Keep windows closed during heavy downpours to prevent water seepage.",
      "Stay updated on weather bulletins before embarking on long routes."
    );
  } else {
    recommendedActions.push(
      "Keep emergency kits stocked for the monsoon season.",
      "Ensure household contact numbers are written down offline.",
      "Monitor standard local forecasts."
    );
  }

  // Confidence estimation based on length/completeness
  let confidence: "low" | "medium" | "high" = "high";
  // If hourly forecast is missing entries, drop confidence
  if (forecast.hourly.time.length < 24) {
    confidence = "low";
  } else {
    const daysOut = (new Date(forecast.daily.time[0]).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysOut > 3) {
      confidence = "low";
    } else if (daysOut > 1) {
      confidence = "medium";
    }
  }

  return {
    overall: overallRisk,
    heavyRain: rainRisk,
    flooding: floodingRisk,
    thunderstorm: stormRisk,
    wind: windRisk,
    visibility: visibilityRisk,
    travel: travelRisk,
    powerDisruption: powerRisk,
    reasons,
    recommendedActions,
    validFrom: forecast.hourly.time[0] || new Date().toISOString(),
    validUntil: forecast.hourly.time[Math.min(71, forecast.hourly.time.length - 1)] || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    confidence,
  };
}

export function calculateEventPhase(
  overallRisk: RiskLevel,
  forecast: WeatherForecastResponse | null,
  userObservations: Array<{ hazardType: string }> = []
): EventPhase {
  if (!forecast) return "normal";

  const hasActiveObservations = userObservations.length > 0;

  if (overallRisk === "severe" || overallRisk === "high") {
    const hasImmediateRain = forecast.hourly.precipitation.slice(0, 24).some(p => p > 5);
    if (hasImmediateRain) {
      return "active";
    } else {
      return "prepare";
    }
  }

  if (overallRisk === "moderate") {
    return "prepare";
  }

  if (hasActiveObservations) {
    return "recovery";
  }

  return "normal";
}
