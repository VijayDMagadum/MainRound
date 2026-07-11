"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  AlertTriangle, 
  Activity, 
  HelpCircle, 
  Loader2, 
  CheckCircle,
  FileText,
  Briefcase,
  Zap,
  Droplet
} from "lucide-react";

interface RecoveryPlannerProps {
  household: any;
  locale: string;
}

export default function RecoveryPlanner({ household, locale }: RecoveryPlannerProps) {
  const [observedIssues, setObservedIssues] = useState({
    floodingInside: false,
    wetOutlets: false,
    dirtyWater: false,
    structuralDamage: false,
  });

  const [loading, setLoading] = useState(false);
  const [recoveryPlan, setRecoveryPlan] = useState<any | null>(null);

  const handleCheckboxChange = (key: keyof typeof observedIssues) => {
    setObservedIssues(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    setRecoveryPlan(null);

    // Map checked items to structured observations array
    const observations = [];
    if (observedIssues.floodingInside) {
      observations.push({ hazardType: "flooding", severity: "high", description: "Water entered the main living room/ground floor compound." });
    }
    if (observedIssues.wetOutlets) {
      observations.push({ hazardType: "electrical", severity: "severe", description: "Main switches or socket points are damp and were partially submerged." });
    }
    if (observedIssues.dirtyWater) {
      observations.push({ hazardType: "water_safety", severity: "high", description: "Tap water from pipeline has an odor/discoloration." });
    }
    if (observedIssues.structuralDamage) {
      observations.push({ hazardType: "structural", severity: "severe", description: "Wall plaster cracking or tiles lifting from moisture." });
    }

    try {
      const res = await fetch("/api/ai/recovery-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          observations,
          household,
          locale
        })
      });

      if (!res.ok) {
        throw new Error("Failed to compile recovery plan");
      }

      const plan = await res.json();
      setRecoveryPlan(plan);
    } catch (e) {
      console.error(e);
      alert("Error compiling recovery plan. Check connections.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Damage Selection Form */}
      <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
          <Activity className="text-teal-400 w-5 h-5" /> Select Local Damage Observations
        </h2>
        <p className="text-slate-400 text-xs leading-relaxed">
          Check any issues you are actively experiencing in your household post-monsoon. The AI will customize electrical, food, and cleanup precautions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 p-3.5 bg-slate-950/45 border border-slate-900 hover:border-slate-800/80 rounded-xl transition-all cursor-pointer">
            <input
              type="checkbox"
              checked={observedIssues.floodingInside}
              onChange={() => handleCheckboxChange("floodingInside")}
              className="mt-0.5 w-4 h-4 rounded text-teal-500 accent-teal-500 border-slate-850 bg-slate-950 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-200 block">Flooding / Waterlogging inside home</span>
              <span className="text-slate-400 block mt-0.5 text-[10px]">Water entered compound, bedrooms, or garage.</span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 bg-slate-950/45 border border-slate-900 hover:border-slate-800/80 rounded-xl transition-all cursor-pointer">
            <input
              type="checkbox"
              checked={observedIssues.wetOutlets}
              onChange={() => handleCheckboxChange("wetOutlets")}
              className="mt-0.5 w-4 h-4 rounded text-teal-500 accent-teal-500 border-slate-850 bg-slate-950 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-200 block">Damp Electrical Walls / Sockets</span>
              <span className="text-slate-400 block mt-0.5 text-[10px]">Sockets were partially submerged or walls are wet to the touch.</span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 bg-slate-950/45 border border-slate-900 hover:border-slate-800/80 rounded-xl transition-all cursor-pointer">
            <input
              type="checkbox"
              checked={observedIssues.dirtyWater}
              onChange={() => handleCheckboxChange("dirtyWater")}
              className="mt-0.5 w-4 h-4 rounded text-teal-500 accent-teal-500 border-slate-850 bg-slate-950 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-200 block">Odorous / Muddy Tap Water</span>
              <span className="text-slate-400 block mt-0.5 text-[10px]">Pipeline water appears slightly yellow or smells unusual.</span>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 bg-slate-950/45 border border-slate-900 hover:border-slate-800/80 rounded-xl transition-all cursor-pointer">
            <input
              type="checkbox"
              checked={observedIssues.structuralDamage}
              onChange={() => handleCheckboxChange("structuralDamage")}
              className="mt-0.5 w-4 h-4 rounded text-teal-500 accent-teal-500 border-slate-850 bg-slate-950 cursor-pointer"
            />
            <div className="text-xs">
              <span className="font-semibold text-slate-200 block">Moisture wall cracks / Lifted tiles</span>
              <span className="text-slate-400 block mt-0.5 text-[10px]">Lifting tiles, plaster cracking on ceilings, or seepage visible.</span>
            </div>
          </label>
        </div>

        <button
          onClick={handleGeneratePlan}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-teal-500/10"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              <span>Analyzing Damage Reports...</span>
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 text-slate-950" />
              <span>Compile Recovery Safety plan</span>
            </>
          )}
        </button>
      </div>

      {/* Recovery Guidelines */}
      {recoveryPlan && (
        <div className="space-y-6">
          {/* Summary card */}
          <div className="glass-card rounded-2xl p-6 border border-teal-500/20 bg-teal-950/5">
            <h3 className="text-lg font-bold text-slate-100">{recoveryPlan.title}</h3>
            <p className="text-slate-400 text-xs leading-relaxed mt-2">{recoveryPlan.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Immediate Safety checks */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400" /> Immediate Safety Checks
              </h3>
              <div className="space-y-2.5">
                {recoveryPlan.immediateSafetyChecks.map((check: string, idx: number) => (
                  <div key={idx} className="bg-red-950/10 border border-red-900/20 p-3 rounded-xl text-xs text-slate-400 leading-relaxed flex items-start gap-2">
                    <span className="text-red-450 font-bold">•</span>
                    <span>{check}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Electrical Safety */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" /> Electrical Outlets Safety
              </h3>
              <div className="space-y-2">
                {recoveryPlan.electricalSafety.map((task: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0"></div>
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Water & Food Safety */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Droplet className="w-4 h-4 text-teal-400" /> Drinking Water & Food Safety
              </h3>
              <div className="space-y-2">
                {recoveryPlan.waterSafety.map((task: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 shrink-0"></div>
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cleanup tasks */}
            <div className="glass-card rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-teal-400" /> Step-by-Step Cleanup Tasks
              </h3>
              <div className="space-y-2">
                {recoveryPlan.cleanupTasks.map((task: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-400 leading-relaxed">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 shrink-0"></div>
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Replenish Supplies */}
            <div className="glass-card rounded-2xl p-6 space-y-4 md:col-span-2">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-teal-400" /> Replenish Emergency Supplies
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recoveryPlan.replenishSupplies.map((task: string, idx: number) => (
                  <div key={idx} className="bg-slate-950/60 p-3 rounded-xl border border-slate-900 text-xs text-slate-450 leading-relaxed flex items-start gap-2">
                    <span className="text-teal-400 font-bold">•</span>
                    <span>{task}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Safety Warning limitations */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-2xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-500 leading-relaxed">
              <strong>Recovery Plan Safety Limitation:</strong>{" "}
              {recoveryPlan.limitations[0]}. {recoveryPlan.limitations[1] || "Always hire certified electricians and municipal structural engineers to check heavily waterlogged houses before re-occupying."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
