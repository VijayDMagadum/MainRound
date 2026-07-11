import { z } from "zod";

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const MULTISPACE = /\s+/g;

const LOCALES = ["en", "hi", "mr"] as const;
const DWELLING_TYPES = ["apartment", "house", "temporary", "hostel", "informal", "other"] as const;
const VEHICLE_TYPES = ["none", "2wheeler", "4wheeler"] as const;
const TRAVEL_MODES = ["public", "private", "2wheeler", "walking"] as const;

export const HazardTypeSchema = z.enum([
  "flooding",
  "waterlogging",
  "fallen_tree",
  "power_outage",
  "wind_damage",
  "other",
]);

export const SeveritySchema = z.enum(["low", "moderate", "high", "severe"]);

export function sanitizeText(value: unknown, maxLength = 500): string {
  const text = value == null ? "" : String(value);
  return text.replace(CONTROL_CHARS, "").replace(MULTISPACE, " ").trim().slice(0, maxLength);
}

function oneOf<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  const normalized = sanitizeText(value, 32).toLowerCase();
  return allowed.includes(normalized as T[number]) ? normalized as T[number] : fallback;
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function clampNumber(value: unknown, fallback: number | null, min: number, max: number): number | null {
  if (value === "" || value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function coerceBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "1" || value === "on" || value === 1;
}

function sanitizeEmergencyContacts(value: unknown): string {
  const rawContacts = typeof value === "string" ? safeParseJson(value, []) : value;
  const contacts = Array.isArray(rawContacts) ? rawContacts : [];

  return JSON.stringify(
    contacts.slice(0, 5).map((contact) => ({
      name: sanitizeText((contact as any)?.name, 80).replace(/[<>]/g, ""),
      relationship: sanitizeText((contact as any)?.relationship, 60).replace(/[<>]/g, ""),
      phone: sanitizeText((contact as any)?.phone, 24).replace(/[^\d+\-\s()]/g, ""),
    })).filter((contact) => contact.name || contact.phone)
  );
}

function safeParseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function normalizeLocale(locale: unknown): "en" | "hi" | "mr" {
  return oneOf(locale, LOCALES, "en");
}

export function sanitizeHouseholdProfileInput(input: any) {
  return {
    dwellingType: oneOf(input?.dwellingType, DWELLING_TYPES, "apartment"),
    floorLevel: clampInteger(input?.floorLevel, 0, 0, 80),
    waterloggingProne: coerceBoolean(input?.waterloggingProne),
    nearHazardSource: coerceBoolean(input?.nearHazardSource),
    hasUpperFloor: coerceBoolean(input?.hasUpperFloor),
    adults: clampInteger(input?.adults, 1, 1, 20),
    children: clampInteger(input?.children, 0, 0, 20),
    olderAdults: clampInteger(input?.olderAdults, 0, 0, 20),
    pets: coerceBoolean(input?.pets),
    accessibilityNeeds: coerceBoolean(input?.accessibilityNeeds),
    medicalPowerDependent: coerceBoolean(input?.medicalPowerDependent),
    vehicleAvailable: oneOf(input?.vehicleAvailable, VEHICLE_TYPES, "none"),
    preferredTravelMode: oneOf(input?.preferredTravelMode, TRAVEL_MODES, "public"),
    emergencyContacts: sanitizeEmergencyContacts(input?.emergencyContacts),
    preferredLanguage: normalizeLocale(input?.preferredLanguage),
  };
}

export const CitizenObservationSchema = z.object({
  hazardType: HazardTypeSchema,
  severity: SeveritySchema,
  location: z.preprocess((value) => sanitizeText(value, 120), z.string().min(2).max(120)),
  latitude: z.preprocess((value) => clampNumber(value, null, -90, 90), z.number().nullable()),
  longitude: z.preprocess((value) => clampNumber(value, null, -180, 180), z.number().nullable()),
  description: z.preprocess((value) => sanitizeText(value, 500), z.string().max(500)).default(""),
}).strict();

export const AssistantHistorySchema = z.array(
  z.object({
    role: z.enum(["user", "assistant"]),
    content: z.preprocess((value) => sanitizeText(value, 1000), z.string().min(1).max(1000)),
  }).strict()
).max(6).default([]);

export const AIQuestionSchema = z.preprocess(
  (value) => sanitizeText(value, 1000),
  z.string().min(2).max(1000)
);

export const TravelDetailsSchema = z.object({
  originName: z.preprocess((value) => sanitizeText(value, 120), z.string().min(2).max(120)),
  destinationName: z.preprocess((value) => sanitizeText(value, 120), z.string().min(2).max(120)),
  departureTime: z.preprocess((value) => sanitizeText(value, 80), z.string().min(1).max(80)),
  returnTime: z.preprocess((value) => sanitizeText(value, 80), z.string().max(80)).optional(),
  travelMode: z.preprocess((value) => oneOf(value, TRAVEL_MODES, "public"), z.enum(TRAVEL_MODES)),
  flexible: z.boolean().default(true),
  hasVulnerablePassengers: z.boolean().default(false),
}).strict();

export const RecoveryObservationSchema = z.object({
  hazardType: HazardTypeSchema,
  severity: SeveritySchema,
  description: z.preprocess((value) => sanitizeText(value, 500), z.string().max(500)),
}).strict();
