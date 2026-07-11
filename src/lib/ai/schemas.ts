import { z } from "zod";

// --- Action Item Schema ---
export const ActionItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  priority: z.enum(["critical", "high", "medium", "low"]),
  timeframe: z.string(),
  reason: z.string(),
});

export type ActionItem = z.infer<typeof ActionItemSchema>;

// --- Preparedness Plan Schema ---
export const PreparednessPlanResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  riskSummary: z.object({
    level: z.enum(["low", "moderate", "high", "severe"]),
    explanation: z.string(),
    confidence: z.enum(["low", "medium", "high"]),
  }),
  immediateActions: z.array(ActionItemSchema),
  nextSixHours: z.array(ActionItemSchema),
  beforeRain: z.array(ActionItemSchema),
  homePreparation: z.array(ActionItemSchema),
  familyCommunication: z.array(ActionItemSchema),
  supplies: z.array(ActionItemSchema),
  accessibility: z.array(ActionItemSchema),
  pets: z.array(ActionItemSchema),
  travel: z.array(ActionItemSchema),
  evacuationReadiness: z.array(ActionItemSchema),
  avoid: z.array(z.string()),
  communityActions: z.array(ActionItemSchema),
  afterEvent: z.array(ActionItemSchema),
  assumptions: z.array(z.string()),
  dataLimitations: z.array(z.string()),
});

export type PreparednessPlanResponse = z.infer<typeof PreparednessPlanResponseSchema>;

// --- Travel Advisory Schema ---
export const TravelAdvisoryResponseSchema = z.object({
  recommendation: z.enum([
    "proceed_with_caution",
    "consider_postponing",
    "avoid_non_essential_travel",
  ]),
  summary: z.string(),
  riskLevel: z.enum(["low", "moderate", "high", "severe"]),
  reasons: z.array(z.string()),
  departureConditions: z.array(z.string()),
  destinationConditions: z.array(z.string()),
  saferTimeWindows: z.array(
    z.object({
      start: z.string(),
      end: z.string(),
      explanation: z.string(),
    })
  ),
  preparation: z.array(z.string()),
  ifStranded: z.array(z.string()),
  limitations: z.array(z.string()),
});

export type TravelAdvisoryResponse = z.infer<typeof TravelAdvisoryResponseSchema>;

// --- Recovery Plan Schema ---
export const RecoveryPlanResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  immediateSafetyChecks: z.array(z.string()),
  electricalSafety: z.array(z.string()),
  waterSafety: z.array(z.string()),
  cleanupTasks: z.array(z.string()),
  replenishSupplies: z.array(z.string()),
  limitations: z.array(z.string()),
});

export type RecoveryPlanResponse = z.infer<typeof RecoveryPlanResponseSchema>;

// --- Conversational Assistant Schema ---
export const AssistantResponseSchema = z.object({
  answer: z.string(),
  warning: z.string().optional(),
  suggestedFollowUps: z.array(z.string()),
});

export type AssistantResponse = z.infer<typeof AssistantResponseSchema>;
