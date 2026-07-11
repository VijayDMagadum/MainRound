export interface SafeHouseholdProfile {
  dwellingType: string;
  floorLevel: number;
  waterloggingProne: boolean;
  nearHazardSource: boolean;
  hasUpperFloor: boolean;
  adults: number;
  children: number;
  olderAdults: number;
  pets: boolean;
  accessibilityNeeds: boolean;
  medicalPowerDependent: boolean;
  vehicleAvailable: string;
  preferredTravelMode: string;
  preferredLanguage: string;
}

export function createAISafeProfile(profile: any): SafeHouseholdProfile {
  if (!profile) {
    return {
      dwellingType: "apartment",
      floorLevel: 0,
      waterloggingProne: false,
      nearHazardSource: false,
      hasUpperFloor: false,
      adults: 1,
      children: 0,
      olderAdults: 0,
      pets: false,
      accessibilityNeeds: false,
      medicalPowerDependent: false,
      vehicleAvailable: "none",
      preferredTravelMode: "public",
      preferredLanguage: "en"
    };
  }

  // Pick only the fields allowed for the AI.
  // Explicitly do NOT copy sessionId, id, emergencyContacts, or any user names/addresses.
  return {
    dwellingType: String(profile.dwellingType || "apartment"),
    floorLevel: Number(profile.floorLevel ?? 0),
    waterloggingProne: Boolean(profile.waterloggingProne),
    nearHazardSource: Boolean(profile.nearHazardSource),
    hasUpperFloor: Boolean(profile.hasUpperFloor),
    adults: Number(profile.adults ?? 1),
    children: Number(profile.children ?? 0),
    olderAdults: Number(profile.olderAdults ?? 0),
    pets: Boolean(profile.pets),
    accessibilityNeeds: Boolean(profile.accessibilityNeeds),
    medicalPowerDependent: Boolean(profile.medicalPowerDependent),
    vehicleAvailable: String(profile.vehicleAvailable || "none"),
    preferredTravelMode: String(profile.preferredTravelMode || "public"),
    preferredLanguage: String(profile.preferredLanguage || "en")
  };
}
