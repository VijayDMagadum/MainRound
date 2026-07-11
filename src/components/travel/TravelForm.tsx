"use client";

import React, { useState, useEffect } from "react";
import { 
  MapPin, 
  Car, 
  Calendar, 
  Users, 
  HelpCircle, 
  AlertTriangle, 
  Loader2, 
  CheckCircle, 
  ChevronRight,
  RefreshCw,
  Compass
} from "lucide-react";

interface TravelFormProps {
  locale: string;
}

export default function TravelForm({ locale }: TravelFormProps) {
  // Form input states
  const [originQuery, setOriginQuery] = useState("");
  const [originResults, setOriginResults] = useState<any[]>([]);
  const [originSelected, setOriginSelected] = useState<any | null>(null);

  const [destQuery, setDestQuery] = useState("");
  const [destResults, setDestResults] = useState<any[]>([]);
  const [destSelected, setDestSelected] = useState<any | null>(null);

  const [travelMode, setTravelMode] = useState("public");
  const [departureTime, setDepartureTime] = useState("");
  const [flexible, setFlexible] = useState(true);
  const [hasVulnerable, setHasVulnerable] = useState(false);

  const [searchingOrigin, setSearchingOrigin] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);
  const [advisoryResult, setAdvisoryResult] = useState<any | null>(null);

  // Debounced search for Origin
  useEffect(() => {
    if (originQuery.trim().length < 2) {
      setOriginResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setSearchingOrigin(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(originQuery)}&count=5&language=en&format=json`);
        const data = await res.json();
        if (data.results) setOriginResults(data.results);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingOrigin(false);
      }
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [originQuery]);

  // Debounced search for Destination
  useEffect(() => {
    if (destQuery.trim().length < 2) {
      setDestResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setSearchingDest(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destQuery)}&count=5&language=en&format=json`);
        const data = await res.json();
        if (data.results) setDestResults(data.results);
      } catch (e) {
        console.error(e);
      } finally {
        setSearchingDest(false);
      }
    }, 600);
    return () => clearTimeout(delayDebounceFn);
  }, [destQuery]);

  // Handle Form Submission to generate AI Travel Advisory
  const handleGenerateAdvisory = async () => {
    if (!originSelected || !destSelected) return;

    setLoadingAdvisory(true);
    setAdvisoryResult(null);

    try {
      // 1. Fetch weather forecast for both origin & destination
      const [originWeatherRes, destWeatherRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${originSelected.latitude}&longitude=${originSelected.longitude}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,visibility&daily=precipitation_sum,precipitation_probability_max,wind_gusts_10m_max&timezone=auto&forecast_days=3`),
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${destSelected.latitude}&longitude=${destSelected.longitude}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,visibility&daily=precipitation_sum,precipitation_probability_max,wind_gusts_10m_max&timezone=auto&forecast_days=3`)
      ]);

      const originWeather = await originWeatherRes.json();
      const destWeather = await destWeatherRes.json();

      // Structure forecast payload for server risk engines
      const formatPayload = (w: any) => ({
        latitude: w.latitude,
        longitude: w.longitude,
        timezone: w.timezone,
        current: w.current,
        hourly: {
          time: w.hourly.time,
          temperature_2m: w.hourly.temperature_2m,
          apparent_temperature: w.hourly.temperature_2m,
          precipitation_probability: w.hourly.precipitation_probability,
          precipitation: w.hourly.precipitation,
          weather_code: w.hourly.weather_code,
          visibility: w.hourly.visibility,
          wind_speed_10m: Array(72).fill(w.current.wind_speed_10m),
          wind_gusts_10m: Array(72).fill(w.current.wind_gusts_10m),
        },
        daily: {
          time: w.daily.time,
          temperature_2m_max: w.daily.temperature_2m_max || [27],
          temperature_2m_min: w.daily.temperature_2m_min || [22],
          precipitation_sum: w.daily.precipitation_sum,
          precipitation_probability_max: w.daily.precipitation_probability_max,
          wind_gusts_10m_max: w.daily.wind_gusts_10m_max,
          sunrise: Array(3).fill(""),
          sunset: Array(3).fill(""),
          weather_code: w.daily.weather_code,
        }
      });

      // 2. Query server route handler
      const response = await fetch("/api/ai/travel-advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originWeather: formatPayload(originWeather),
          destinationWeather: formatPayload(destWeather),
          travelDetails: {
            originName: originSelected.name,
            destinationName: destSelected.name,
            departureTime,
            travelMode,
            flexible,
            hasVulnerablePassengers: hasVulnerable
          },
          locale
        })
      });

      if (!response.ok) {
        throw new Error("Failed to compile travel advisory");
      }

      const advisory = await response.json();
      setAdvisoryResult(advisory);
    } catch (err) {
      console.error(err);
      alert("Error compiling travel data. Check network connections and try again.");
    } finally {
      setLoadingAdvisory(false);
    }
  };

  const recStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
    proceed_with_caution: { bg: "bg-blue-950/45", text: "text-blue-400", border: "border-blue-500/30", label: "Proceed With Caution" },
    consider_postponing: { bg: "bg-amber-950/45", text: "text-amber-400", border: "border-amber-500/30", label: "Consider Postponing" },
    avoid_non_essential_travel: { bg: "bg-red-950/45", text: "text-red-400", border: "border-red-500/30", label: "Avoid Non-Essential Travel" },
  };

  const currentRec = advisoryResult ? (recStyles[advisoryResult.recommendation] || recStyles.proceed_with_caution) : null;

  return (
    <div className="space-y-6">
      {/* Travel Query form inputs */}
      <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Compass className="w-5 h-5 text-teal-400" /> Travel Query Details
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Origin Search */}
          <div className="space-y-2 relative">
            <label className="text-xs text-slate-300 font-semibold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-teal-400" /> Departure Location (Origin)
            </label>
            <input
              type="text"
              value={originQuery}
              onChange={(e) => setOriginQuery(e.target.value)}
              placeholder="Search origin e.g. Mumbai..."
              className="w-full glass-input px-3.5 py-2 text-xs rounded-xl"
            />
            {searchingOrigin && (
              <Loader2 className="w-4 h-4 animate-spin text-teal-400 absolute right-3 top-9" />
            )}
            
            {originResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-1 divide-y divide-slate-850">
                {originResults.map((city) => (
                  <button
                    key={`${city.latitude}-${city.longitude}`}
                    type="button"
                    onClick={() => {
                      setOriginSelected({
                        name: `${city.name}, ${city.admin1 || ""}, ${city.country}`,
                        latitude: city.latitude,
                        longitude: city.longitude
                      });
                      setOriginQuery("");
                      setOriginResults([]);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-350 hover:text-teal-400 hover:bg-slate-800 rounded-lg"
                  >
                    {city.name}, {city.admin1} ({city.country})
                  </button>
                ))}
              </div>
            )}

            {originSelected && (
              <div className="bg-teal-950/20 border border-teal-500/20 text-teal-400 text-xs px-3 py-1.5 rounded-lg">
                Selected: <strong>{originSelected.name}</strong>
              </div>
            )}
          </div>

          {/* Destination Search */}
          <div className="space-y-2 relative">
            <label className="text-xs text-slate-300 font-semibold flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-teal-400" /> Arrival Location (Destination)
            </label>
            <input
              type="text"
              value={destQuery}
              onChange={(e) => setDestQuery(e.target.value)}
              placeholder="Search destination e.g. Pune..."
              className="w-full glass-input px-3.5 py-2 text-xs rounded-xl"
            />
            {searchingDest && (
              <Loader2 className="w-4 h-4 animate-spin text-teal-400 absolute right-3 top-9" />
            )}

            {destResults.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-1 divide-y divide-slate-850">
                {destResults.map((city) => (
                  <button
                    key={`${city.latitude}-${city.longitude}`}
                    type="button"
                    onClick={() => {
                      setDestSelected({
                        name: `${city.name}, ${city.admin1 || ""}, ${city.country}`,
                        latitude: city.latitude,
                        longitude: city.longitude
                      });
                      setDestQuery("");
                      setDestResults([]);
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-slate-350 hover:text-teal-400 hover:bg-slate-800 rounded-lg"
                  >
                    {city.name}, {city.admin1} ({city.country})
                  </button>
                ))}
              </div>
            )}

            {destSelected && (
              <div className="bg-teal-950/20 border border-teal-500/20 text-teal-400 text-xs px-3 py-1.5 rounded-lg">
                Selected: <strong>{destSelected.name}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Other settings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-2">
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-slate-400" /> Commute Vehicle
            </label>
            <select
              value={travelMode}
              onChange={(e) => setTravelMode(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
            >
              <option value="public">Public Transport (Train/Bus)</option>
              <option value="4wheeler">4 Wheeler (Car/SUV)</option>
              <option value="2wheeler">2 Wheeler (Motorcycle)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Departure Date/Time
            </label>
            <input
              type="datetime-local"
              value={departureTime}
              onChange={(e) => setDepartureTime(e.target.value)}
              className="w-full glass-input px-3 py-2 text-xs rounded-xl outline-none"
            />
          </div>

          <div className="space-y-3 pt-6 flex flex-col justify-end">
            <label className="flex items-center gap-2 text-xs text-slate-350 cursor-pointer">
              <input
                type="checkbox"
                checked={flexible}
                onChange={(e) => setFlexible(e.target.checked)}
                className="w-4 h-4 rounded border-slate-850 accent-teal-500 cursor-pointer"
              />
              <span>Flexible schedule to postpone</span>
            </label>
            
            <label className="flex items-center gap-2 text-xs text-slate-355 cursor-pointer">
              <input
                type="checkbox"
                checked={hasVulnerable}
                onChange={(e) => setHasVulnerable(e.target.checked)}
                className="w-4 h-4 rounded border-slate-850 accent-teal-500 cursor-pointer"
              />
              <span className="flex items-center gap-1">
                Travel with children / elderly / mobility needs
              </span>
            </label>
          </div>
        </div>

        <button
          onClick={handleGenerateAdvisory}
          disabled={loadingAdvisory || !originSelected || !destSelected}
          className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-teal-500/10"
        >
          {loadingAdvisory ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Analyzing Weather Fronts...</span>
            </>
          ) : (
            <>
              <Compass className="w-4 h-4 text-slate-950" />
              <span>Generate Travel Advisory</span>
            </>
          )}
        </button>
      </div>

      {/* Advisory Result Cards */}
      {advisoryResult && currentRec && (
        <div className="space-y-6">
          {/* Main decision card */}
          <div className={`glass-card rounded-2xl p-6 md:p-8 border flex flex-col md:flex-row justify-between gap-6 ${currentRec.border}`}>
            <div className="space-y-4 flex-1">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Travel Recommendation</span>
                <h3 className={`text-2xl font-black mt-1 ${currentRec.text}`}>{currentRec.label}</h3>
                <p className="text-slate-200 text-xs mt-2 font-medium leading-relaxed">{advisoryResult.summary}</p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hazard Reasons:</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-400 text-xs leading-relaxed">
                  {advisoryResult.reasons.map((reason: string, idx: number) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Weather comparisons */}
            <div className="w-full md:w-80 bg-slate-950/45 p-4 rounded-xl border border-slate-900 divide-y divide-slate-850">
              <div className="pb-3 text-xs">
                <span className="font-bold text-slate-300 block">Origin Conditions:</span>
                <span className="text-slate-400 text-[11px] block mt-1">{advisoryResult.departureConditions[0] || "Standard"}</span>
              </div>
              <div className="pt-3 text-xs">
                <span className="font-bold text-slate-300 block">Destination Conditions:</span>
                <span className="text-slate-400 text-[11px] block mt-1">{advisoryResult.destinationConditions[0] || "Standard"}</span>
              </div>
            </div>
          </div>

          {/* Safer Windows, Preparation list, Stranded instructions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Safer time windows */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-teal-400" /> Alternate Safe Windows
              </h3>
              <div className="space-y-3">
                {advisoryResult.saferTimeWindows && advisoryResult.saferTimeWindows.length > 0 ? (
                  advisoryResult.saferTimeWindows.map((win: any, idx: number) => (
                    <div key={idx} className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-900 space-y-1">
                      <span className="font-bold text-xs text-slate-200 block">
                        {win.start} to {win.end}
                      </span>
                      <p className="text-[11px] text-slate-400 leading-relaxed">{win.explanation}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-450 italic">No alternative safer window can be computed from current 72-hour forecasts.</p>
                )}
              </div>
            </div>

            {/* Preparation checklist */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-teal-400" /> Travel Preparation Checklist
              </h3>
              <div className="space-y-2">
                {advisoryResult.preparation.map((prep: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-450 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 shrink-0"></div>
                    <span>{prep}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Safe stranded behavior */}
            <div className="glass-card rounded-2xl p-6 space-y-4 md:col-span-2">
              <h3 className="font-bold text-sm text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400" /> If Stranded / Trapped in Water
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {advisoryResult.ifStranded.map((task: string, idx: number) => (
                  <div key={idx} className="bg-red-950/10 border border-red-900/30 p-3.5 rounded-xl text-xs text-slate-400 leading-relaxed flex items-start gap-2">
                    <span className="font-bold text-red-400">{idx + 1}.</span>
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Data disclaimers */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-500 leading-relaxed space-y-1">
              <strong>Data Limitations Statement:</strong>
              <p>{advisoryResult.limitations[0]}</p>
              <p>{advisoryResult.limitations[1] || "This advisory does not include live rail cancellations, flight delays, or sudden landslides. Exercise judgment."}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
