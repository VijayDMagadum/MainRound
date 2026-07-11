"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  MapPin, 
  Eye, 
  UserCheck, 
  Plus, 
  Loader2, 
  FileText,
  Clock,
  Compass,
  CheckCircle,
  EyeOff
} from "lucide-react";

interface AlertsManagerProps {
  locale: string;
}

export default function AlertsManager({ locale }: AlertsManagerProps) {
  const [systemAlerts, setSystemAlerts] = useState<any[]>([]);
  const [observations, setObservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [hazardType, setHazardType] = useState("waterlogging");
  const [severity, setSeverity] = useState("high");
  const [locationName, setLocationName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts");
      if (res.ok) {
        const data = await res.json();
        setSystemAlerts(data.systemAlerts || []);
        setObservations(data.observations || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Acknowledge alert
  const handleAcknowledge = async (alertId: string) => {
    // Optimistic UI update
    setSystemAlerts(prev => prev.map(a => a.id === alertId ? { ...a, acknowledged: true } : a));
    
    try {
      await fetch("/api/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId })
      });
    } catch (e) {
      console.error(e);
      fetchAlerts(); // Revert
    }
  };

  // Submit citizen observation
  const handleSubmitObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName.trim() || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hazardType,
          severity,
          location: locationName,
          description
        })
      });

      if (res.ok) {
        setLocationName("");
        setDescription("");
        fetchAlerts(); // Refetch observations
        alert("Observation submitted successfully. Thank you for keeping Saathi communities updated!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const severityColors: Record<string, string> = {
    low: "text-emerald-400 border-emerald-500/20 bg-emerald-950/20",
    moderate: "text-blue-400 border-blue-500/20 bg-blue-950/20",
    high: "text-amber-400 border-amber-500/20 bg-amber-950/20",
    severe: "text-red-400 border-red-500/20 bg-red-950/20"
  };

  return (
    <div className="space-y-6">
      {/* Alert Lists */}
      {loading ? (
        <div className="h-64 bg-slate-900/40 rounded-2xl border border-slate-950 animate-pulse flex items-center justify-center">
          <span className="text-xs text-slate-500">Checking alert feeds...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Active warnings list */}
          <div className="md:col-span-2 space-y-6">
            {/* System Warnings */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-350 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Active System Estimations
              </h2>

              {systemAlerts.length > 0 ? (
                <div className="space-y-3">
                  {systemAlerts.map(alert => {
                    const color = severityColors[alert.severity] || severityColors.low;
                    return (
                      <div 
                        key={alert.id}
                        className={`p-4 rounded-xl border flex justify-between items-start gap-4 transition-all ${color} ${
                          alert.acknowledged ? "opacity-40" : ""
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold uppercase text-xs tracking-wider">{alert.severity} ALERT</span>
                            <span className="text-[10px] text-slate-500 font-mono">Location: {alert.location}</span>
                          </div>
                          <p className="text-slate-200 text-xs leading-relaxed mt-1 font-medium">{alert.reason}</p>
                          <span className="text-[9px] text-slate-500 block pt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Start: {new Date(alert.startTime).toLocaleTimeString()} | Source: {alert.dataSource}
                          </span>
                        </div>

                        {!alert.acknowledged && (
                          <button
                            onClick={() => handleAcknowledge(alert.id)}
                            className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-[10px] font-bold text-teal-400 hover:text-teal-300 rounded-lg shrink-0 cursor-pointer"
                          >
                            Acknowledge
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-900/20 border border-slate-900 p-6 rounded-2xl text-center text-xs text-slate-500">
                  No active system alerts estimated. Weather conditions are within normal limits.
                </div>
              )}
            </div>

            {/* Citizen reports */}
            <div className="space-y-4 pt-2">
              <h2 className="text-sm font-bold text-slate-350 uppercase tracking-widest flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-teal-400" /> Active Citizen Observations
              </h2>

              {observations.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {observations.map(obs => {
                    const color = severityColors[obs.severity] || severityColors.low;
                    return (
                      <div key={obs.id} className={`p-4 rounded-xl border space-y-2 ${color}`}>
                        <div className="flex justify-between items-start">
                          <span className="font-bold text-[10px] uppercase tracking-wide border px-1.5 py-0.5 rounded border-slate-800 bg-slate-950">
                            {obs.hazardType}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {new Date(obs.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-teal-400 shrink-0" /> {obs.location}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-relaxed italic">"{obs.description}"</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-slate-900/20 border border-slate-900 p-6 rounded-2xl text-center text-xs text-slate-500">
                  No citizen hazard observations reported in this window.
                </div>
              )}
            </div>
          </div>

          {/* Report an observation form */}
          <div className="space-y-6">
            <form onSubmit={handleSubmitObservation} className="glass-card rounded-2xl p-6 space-y-4 border border-slate-850">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-teal-400" /> Report Hazard Observation
              </h3>
              <p className="text-[10px] text-slate-550 leading-relaxed">
                Spotted waterlogging, fallen trees, or electric wire sparks? Share details here to alert nearby users.
              </p>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Hazard Type</label>
                <select
                  value={hazardType}
                  onChange={(e) => setHazardType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                >
                  <option value="waterlogging">Street Waterlogging / Puddles</option>
                  <option value="flooding">Flooding inside structure</option>
                  <option value="fallen_tree">Fallen Tree / Road Blockage</option>
                  <option value="power_outage">Local Grid Power Outage</option>
                  <option value="wind_damage">Wind Damage (Sheet lift, scaffolding)</option>
                  <option value="other">Other hazard</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Estimated Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
                >
                  <option value="low">Low (Passable with care)</option>
                  <option value="moderate">Moderate (Commute delayed)</option>
                  <option value="high">High (Flooding started/Vehicles stuck)</option>
                  <option value="severe">Severe (Life risk/Evacuation required)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Location (Area/Chowk Name)</label>
                <input
                  type="text"
                  required
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g. Linking Road corner"
                  className="w-full glass-input px-3.5 py-2 text-xs rounded-xl outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Observation Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Water is rising fast. 3 stalled bikes. Avoid routes."
                  rows={3}
                  className="w-full glass-input px-3.5 py-2.5 text-xs rounded-xl outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !locationName.trim()}
                className="w-full py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition-all disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 text-slate-950" />}
                Submit Report
              </button>
            </form>

            {/* Privacy details */}
            <div className="bg-slate-905/30 border border-slate-900 p-4 rounded-2xl flex items-start gap-2 text-[10px] text-slate-500 leading-relaxed">
              <EyeOff className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <span>
                <strong>Anonymous Observations</strong>: Citizen posts are published anonymously. Avoid writing personal names, house numbers, or phone details in description box.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
