"use client";

import React, { useEffect, useState } from "react";
import { Loader2, MapPin, Navigation } from "lucide-react";

interface DashboardLocationLoaderProps {
  locale: string;
}

export default function DashboardLocationLoader({ locale }: DashboardLocationLoaderProps) {
  const [status, setStatus] = useState("Detecting your location to fetch local weather risk...");

  useEffect(() => {
    if (!navigator.geolocation) {
      // Geolocation not supported, go to manual onboarding
      window.location.href = `/${locale}/onboarding`;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setStatus("Location acquired! Naming your region...");

        let cityName = `Current Location (${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E)`;

        try {
          // Keyless Open-Meteo reverse geocoding API or simple lat/long naming fallback
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${locale}`
          );
          if (geoRes.ok) {
            const data = await geoRes.json();
            cityName = data.address.city || data.address.town || data.address.suburb || data.address.village || cityName;
          }
        } catch (e) {
          console.warn("Reverse geocode failed, using lat/long coordinates name.");
        }

        setStatus("Saving as your default primary location...");

        try {
          // 1. Create a default profile if it doesn't exist
          await fetch("/api/profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
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
              preferredLanguage: locale
            })
          });

          // 2. Set as primary location
          await fetch("/api/profile/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: cityName,
              latitude,
              longitude,
              isPrimary: true
            })
          });

          // Reload to mount active dashboard weather views
          window.location.reload();
        } catch (dbErr) {
          console.error("Failed to seed primary location", dbErr);
          window.location.href = `/${locale}/onboarding`;
        }
      },
      (geoErr) => {
        console.warn("Geolocation permission denied or timed out. Redirecting to onboarding.");
        window.location.href = `/${locale}/onboarding`;
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [locale]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 text-center">
      <div className="relative p-6 bg-slate-900/60 border border-slate-800 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm space-y-4">
        <div className="p-4 bg-teal-950/40 rounded-full border border-teal-500/20 text-teal-400 animate-pulse">
          <Navigation className="w-8 h-8 text-teal-450" />
        </div>
        <h2 className="text-md font-bold text-slate-100 flex items-center gap-1.5 justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-teal-400" /> Auto-Configuring Session
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          {status}
        </p>
        <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-900 w-full">
          If blocked or disabled, the application redirects automatically to manual search onboarding.
        </div>
      </div>
    </div>
  );
}
