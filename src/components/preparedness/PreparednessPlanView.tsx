"use client";

import React, { useState, useEffect } from "react";
import { 
  CloudRain, 
  AlertTriangle, 
  CheckSquare, 
  Printer, 
  Download, 
  Copy, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  Info,
  ChevronDown,
  UserCheck,
  MapPin,
  Loader2
} from "lucide-react";

interface PreparednessPlanViewProps {
  household: any;
  forecast: any;
  locale: string;
  locations: any[];
}

export default function PreparednessPlanView({
  household,
  forecast,
  locale,
  locations = []
}: PreparednessPlanViewProps) {
  const [selectedLocId, setSelectedLocId] = useState("");
  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  // Load / Fetch plan details
  const fetchPlan = async (locId: string, locForecast: any) => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/preparedness-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          household,
          forecast: locForecast,
          locale
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch plan");
      }

      const data = await res.json();
      setPlan(data);
      localStorage.setItem(`preparednessPlan_${locId}`, JSON.stringify(data));
    } catch (err) {
      console.error(err);
      alert("Error compiling AI plan. Displaying local deterministic backups.");
    } finally {
      setLoading(false);
    }
  };

  // Get forecast and make API call
  const getForecastAndPlan = async (locId: string, initialForecastObj?: any) => {
    setLoading(true);
    setPlan(null);
    try {
      const targetLoc = locations.find(l => l.id === locId);
      if (!targetLoc) return;

      let targetForecast = initialForecastObj;
      if (!targetForecast) {
        // Fetch weather forecast client-side
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${targetLoc.latitude}&longitude=${targetLoc.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,rain,showers,weather_code,visibility,wind_speed_10m,wind_gusts_10m&hourly=temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,visibility,wind_speed_10m,wind_gusts_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,sunrise,sunset,weather_code&timezone=auto`
        );
        if (weatherRes.ok) {
          targetForecast = await weatherRes.json();
        }
      }

      await fetchPlan(locId, targetForecast);
    } catch (e) {
      console.error("Failed to load forecast", e);
      setLoading(false);
    }
  };

  // Load / Fetch plan details
  const loadPlanForLocation = async (locId: string, initialForecastObj?: any) => {
    const cached = localStorage.getItem(`preparednessPlan_${locId}`);
    const cachedCompleted = localStorage.getItem(`preparednessPlanCompleted_${locId}`);
    
    if (cachedCompleted) {
      try {
        setCompletedActions(JSON.parse(cachedCompleted));
      } catch (e) {
        setCompletedActions({});
      }
    } else {
      setCompletedActions({});
    }

    if (cached) {
      try {
        setPlan(JSON.parse(cached));
      } catch (e) {
        await getForecastAndPlan(locId, initialForecastObj);
      }
    } else {
      await getForecastAndPlan(locId, initialForecastObj);
    }
  };

  // Trigger loading when locations list is available
  useEffect(() => {
    if (locations && locations.length > 0) {
      const primary = locations.find(l => l.isPrimary) || locations[0];
      setSelectedLocId(primary.id);
      loadPlanForLocation(primary.id, forecast);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  // Location Selector Switcher
  const handleLocationSwitch = async (locId: string) => {
    setSelectedLocId(locId);
    const targetLoc = locations.find(l => l.id === locId);
    const initialForecast = targetLoc?.isPrimary ? forecast : null;
    await loadPlanForLocation(locId, initialForecast);
  };

  // Force recalculation
  const handleRegenerate = async () => {
    const targetLoc = locations.find(l => l.id === selectedLocId);
    if (!targetLoc) return;
    localStorage.removeItem(`preparednessPlan_${selectedLocId}`);
    const initialForecast = targetLoc.isPrimary ? forecast : null;
    await getForecastAndPlan(selectedLocId, initialForecast);
  };

  // Toggle action completion state
  const toggleAction = (id: string) => {
    const updated = {
      ...completedActions,
      [id]: !completedActions[id]
    };
    setCompletedActions(updated);
    localStorage.setItem(`preparednessPlanCompleted_${selectedLocId}`, JSON.stringify(updated));
  };

  // Copy Plaintext Summary
  const handleCopySummary = () => {
    if (!plan) return;
    
    const lines = [
      `MONSOON SAATHI SAFETY PLAN: ${plan.title}`,
      `Risk Level: ${plan.riskSummary.level.toUpperCase()}`,
      `Explanation: ${plan.riskSummary.explanation}`,
      "",
      "CRITICAL IMMEDIATE ACTIONS:",
      ...plan.immediateActions.map((act: any) => `- [${completedActions[act.id] ? "x" : " "}] ${act.title}: ${act.description}`),
      "",
      "THINGS TO AVOID:",
      ...plan.avoid.map((av: string) => `- ${av}`)
    ];

    navigator.clipboard.writeText(lines.join("\n"));
    alert("Safety plan summary copied to clipboard!");
  };

  const handlePrint = () => {
    window.print();
  };

  // Risk Color Mapping
  const riskColors: Record<string, string> = {
    low: "border-emerald-500/25 bg-emerald-950/5 text-emerald-450",
    moderate: "border-blue-500/25 bg-blue-950/5 text-blue-450",
    high: "border-amber-500/25 bg-amber-950/5 text-amber-450",
    severe: "border-red-500/25 bg-red-950/5 text-red-450",
  };

  const currentRiskColor = plan ? (riskColors[plan.riskSummary.level] || riskColors.low) : "";

  // Action checklist builder
  const renderActionList = (title: string, list: any[]) => {
    if (!list || list.length === 0) return null;
    return (
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
          <CheckSquare className="w-4 h-4 text-teal-400" /> {title}
        </h3>
        
        <div className="space-y-3">
          {list.map((item) => {
            const isDone = !!completedActions[item.id];
            return (
              <label 
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  isDone 
                    ? "bg-slate-950/40 border-slate-950 opacity-60 text-slate-500" 
                    : "bg-slate-900/30 border-slate-850/80 hover:border-slate-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={() => toggleAction(item.id)}
                  className="mt-0.5 w-4 h-4 rounded text-teal-500 accent-teal-500 cursor-pointer"
                />
                <div className="text-xs">
                  <span className={`font-semibold block ${isDone ? "line-through text-slate-550" : "text-slate-200"}`}>
                    {item.title}
                  </span>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">{item.description}</p>
                  
                  {item.timeframe && (
                    <span className="inline-flex items-center gap-1 text-[9px] mt-1.5 px-2 py-0.5 font-semibold bg-slate-950/80 text-slate-400 border border-slate-900 rounded">
                      <Clock className="w-2.5 h-2.5" /> {item.timeframe}
                    </span>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Location Selector Bar */}
      {locations.length > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-slate-900 p-4 rounded-2xl">
          <div className="flex items-center gap-2">
            <label htmlFor="preparedness-loc-switch" className="text-xs font-bold text-slate-350 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-teal-400" /> Active Preparedness Location:
            </label>
            <select
              id="preparedness-loc-switch"
              value={selectedLocId}
              onChange={(e) => handleLocationSwitch(e.target.value)}
              className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-1.5 text-xs text-slate-250 outline-none focus:border-teal-500"
            >
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} {loc.isPrimary ? "(Primary)" : ""}
                </option>
              ))}
            </select>
          </div>
          
          <span className="text-[10px] text-slate-500 font-mono">
            Keyed storage isolates checklists for secondary monitoring.
          </span>
        </div>
      )}

      {/* Plan Operations Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
          <span className="text-xs text-slate-300 font-medium">
            AI grounded safety recommendations matching local coordinate forecasting.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            disabled={!plan}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold rounded-xl text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Copy className="w-3.5 h-3.5" /> Copy Summary
          </button>
          <button
            onClick={handlePrint}
            disabled={!plan}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold rounded-xl text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-950" /> Regenerate
          </button>
        </div>
      </div>

      {loading && (
        <div className="h-96 bg-slate-900/40 rounded-2xl animate-pulse border border-slate-950 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-teal-450" />
          <span className="text-xs text-slate-550">Compiling personalized safety timeline...</span>
        </div>
      )}

      {/* Main summary grid */}
      {!loading && plan && (
        <div className="space-y-6">
          <div className={`p-6 border rounded-2xl space-y-4 ${currentRiskColor}`}>
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-100">{plan.title}</h2>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-xl">{plan.summary}</p>
              </div>
              <div className={`px-4 py-2 border rounded-xl text-center shrink-0 ${currentRiskColor}`}>
                <span className="text-[10px] uppercase font-bold tracking-widest block opacity-75">Forecast Risk</span>
                <span className="text-xl font-black uppercase mt-1 block">{plan.riskSummary.level}</span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-3 text-[11px] text-slate-450 flex items-start gap-2">
              <Info className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
              <span>
                <strong>Assumptions</strong>: {plan.assumptions ? plan.assumptions.join(" | ") : "Calculated using household specs and selected locality coordinates."}
              </span>
            </div>
          </div>

          {/* Action Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderActionList("Immediate Safety Measures", plan.immediateActions)}
            {renderActionList("Next 6 Hours Checklist", plan.nextSixHours)}
            {renderActionList("Before Rain Starts", plan.beforeRain)}
            {renderActionList("Home Structural Preparation", plan.homePreparation)}
            {renderActionList("Supplies & Batteries Stocks", plan.supplies)}
            {renderActionList("Family & Communication", plan.familyCommunication)}
            {plan.accessibility && plan.accessibility.length > 0 && renderActionList("Accessibility Needs Plan", plan.accessibility)}
            {plan.pets && plan.pets.length > 0 && renderActionList("Pet Safety", plan.pets)}
            {plan.evacuationReadiness && plan.evacuationReadiness.length > 0 && renderActionList("Evacuation Go-Bag", plan.evacuationReadiness)}
            {plan.communityActions && plan.communityActions.length > 0 && renderActionList("Neighborhood/Society Actions", plan.communityActions)}
          </div>

          {/* Things to avoid */}
          <div className="bg-red-950/10 border border-red-900/30 p-6 rounded-2xl space-y-4">
            <h3 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-400" /> CRITICAL ACTIONS TO AVOID
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400 leading-relaxed">
              {plan.avoid.map((item: string, idx: number) => (
                <div key={idx} className="flex gap-2 items-start bg-slate-950/30 border border-red-950/20 p-3 rounded-xl">
                  <span className="text-red-400 font-bold">•</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Data Limitations */}
          <div className="bg-slate-900/20 border border-slate-900 p-4 rounded-2xl flex items-start gap-2.5">
            <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-500 leading-relaxed space-y-1">
              <span className="font-bold text-slate-350 uppercase tracking-wider block">Advisory Limitation Disclaimer</span>
              <p>{plan.dataLimitations?.[0] || "AI preparedness plans are for informational guidance. Monitor announcements from your state disaster management authority."}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
