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
  UserCheck
} from "lucide-react";

interface PreparednessPlanViewProps {
  household: any;
  forecast: any;
  locale: string;
}

export default function PreparednessPlanView({
  household,
  forecast,
  locale
}: PreparednessPlanViewProps) {
  const [plan, setPlan] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [completedActions, setCompletedActions] = useState<Record<string, boolean>>({});

  // Load plan from localStorage or trigger initial fetch
  useEffect(() => {
    const cached = localStorage.getItem("preparednessPlan");
    const cachedCompleted = localStorage.getItem("preparednessPlanCompleted");
    
    if (cachedCompleted) {
      try {
        setCompletedActions(JSON.parse(cachedCompleted));
      } catch (e) {}
    }

    if (cached) {
      try {
        setPlan(JSON.parse(cached));
      } catch (e) {
        fetchPlan();
      }
    } else {
      fetchPlan();
    }
  }, []);

  // Fetch plan from the API
  const fetchPlan = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/preparedness-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          household,
          forecast,
          locale
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch plan");
      }

      const data = await res.json();
      setPlan(data);
      localStorage.setItem("preparednessPlan", JSON.stringify(data));
    } catch (err) {
      console.error(err);
      alert("Error compiling AI plan. Displaying local deterministic backups.");
    } finally {
      setLoading(false);
    }
  };

  // Toggle action completion state
  const toggleAction = (id: string) => {
    const updated = {
      ...completedActions,
      [id]: !completedActions[id]
    };
    setCompletedActions(updated);
    localStorage.setItem("preparednessPlanCompleted", JSON.stringify(updated));
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
    alert("Text summary copied to clipboard!");
  };

  // Download JSON
  const handleDownloadJSON = () => {
    if (!plan) return;
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Saathi_Preparedness_Plan_${locale}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-6 border border-slate-850 animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="h-4 bg-slate-800 rounded w-3/4"></div>
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-slate-850 h-48 animate-pulse"></div>
          <div className="glass-card rounded-2xl p-6 border border-slate-850 h-48 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!plan) return null;

  const riskColors: Record<string, string> = {
    low: "text-emerald-400 border-emerald-500/20 bg-emerald-950/20",
    moderate: "text-blue-400 border-blue-500/20 bg-blue-950/20",
    high: "text-amber-400 border-amber-500/20 bg-amber-950/20",
    severe: "text-red-400 border-red-500/20 bg-red-950/20"
  };

  const currentRiskColor = riskColors[plan.riskSummary.level] || riskColors.low;

  // Helper to render action block
  const renderActionList = (title: string, list: any[]) => {
    if (!list || list.length === 0) return null;
    return (
      <div className="glass-card rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-400" /> {title}
        </h3>
        
        <div className="space-y-3">
          {list.map((act) => (
            <label 
              key={act.id} 
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                completedActions[act.id] 
                  ? "bg-slate-950/40 border-slate-900 text-slate-650 opacity-60" 
                  : "bg-slate-900/30 border-slate-850 hover:border-slate-800"
              }`}
            >
              <input
                type="checkbox"
                checked={!!completedActions[act.id]}
                onChange={() => toggleAction(act.id)}
                className="mt-0.5 w-4 h-4 rounded text-teal-500 accent-teal-500 border-slate-850 bg-slate-950 cursor-pointer"
              />
              <div className="text-xs">
                <span className={`font-semibold block ${completedActions[act.id] ? "line-through text-slate-500" : "text-slate-200"}`}>
                  {act.title}
                </span>
                <span className="text-slate-400 block mt-1 leading-relaxed">{act.description}</span>
                <div className="flex gap-2 mt-2">
                  <span className={`text-[9px] px-2 py-0.5 rounded font-mono border ${
                    act.priority === "critical" 
                      ? "text-red-400 border-red-500/25 bg-red-950/20" 
                      : act.priority === "high"
                      ? "text-amber-400 border-amber-500/25 bg-amber-950/20"
                      : "text-slate-400 border-slate-700 bg-slate-900"
                  }`}>
                    {act.priority.toUpperCase()}
                  </span>
                  {act.reason && (
                    <span className="text-[9px] text-slate-500 italic">Reason: {act.reason}</span>
                  )}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 border border-slate-900 rounded-2xl p-4">
        <span className="text-xs text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-teal-400" /> Plan generated offline.
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopySummary}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold rounded-xl text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" /> Copy
          </button>
          <button
            onClick={handleDownloadJSON}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold rounded-xl text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold rounded-xl text-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
          <button
            onClick={fetchPlan}
            className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-950" /> Regenerate
          </button>
        </div>
      </div>

      {/* Main summary grid */}
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
  );
}
