"use client";

import React, { useState } from "react";
import { 
  Users, 
  MapPin, 
  Clipboard, 
  ShieldCheck, 
  Send, 
  Copy, 
  Plus, 
  Trash2,
  ListTodo
} from "lucide-react";

export default function CommunityCenter() {
  // Volunteer list state
  const [volunteers, setVolunteers] = useState<any[]>([
    { name: "Rahul Sharma", role: "Water Pump & Generator Check", phone: "9812345678" },
    { name: "Anish Patil", role: "First Aid & Medicine Liaison", phone: "9823456789" },
    { name: "Meera Nair", role: "Ground Floor Vulnerable Resident Liaison", phone: "9834567890" }
  ]);
  const [newVolName, setNewVolName] = useState("");
  const [newVolRole, setNewVolRole] = useState("pump_check");
  const [newVolPhone, setNewVolPhone] = useState("");

  // Vulnerable list state
  const [residents, setResidents] = useState<any[]>([
    { flat: "A-102 (Ground Floor)", name: "Mr. & Mrs. Joshi (Elderly)", mobilityNeeded: true, checked: false },
    { flat: "B-004 (Basement)", name: "Karan Johar (Damp Wall/Informal)", mobilityNeeded: false, checked: true }
  ]);
  const [newResFlat, setNewResFlat] = useState("");
  const [newResName, setNewResName] = useState("");
  const [newResMobility, setNewResMobility] = useState(false);

  // Template message settings
  const [smsSeverity, setSmsSeverity] = useState("high");
  const [smsSubject, setSmsSubject] = useState("waterlogging");
  const [generatedSms, setGeneratedSms] = useState("");

  const handleAddVolunteer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVolName || !newVolPhone) return;
    
    const roleLabels: Record<string, string> = {
      pump_check: "Water Pump & Generator Check",
      first_aid: "First Aid & Medicine Liaison",
      vulnerable_liaison: "Vulnerable Resident Liaison",
      sandbag_team: "Sandbag / Structural Protection",
    };

    setVolunteers(prev => [
      ...prev,
      {
        name: newVolName,
        role: roleLabels[newVolRole] || newVolRole,
        phone: newVolPhone
      }
    ]);

    setNewVolName("");
    setNewVolPhone("");
  };

  const handleDeleteVolunteer = (idx: number) => {
    setVolunteers(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddResident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResFlat || !newResName) return;

    setResidents(prev => [
      ...prev,
      {
        flat: newResFlat,
        name: newResName,
        mobilityNeeded: newResMobility,
        checked: false
      }
    ]);

    setNewResFlat("");
    setNewResName("");
    setNewResMobility(false);
  };

  const toggleCheckResident = (idx: number) => {
    setResidents(prev => prev.map((res, i) => i === idx ? { ...res, checked: !res.checked } : res));
  };

  const handleGenerateSms = () => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let text = "";
    
    if (smsSeverity === "severe") {
      text = `⚠️ CRITICAL SOCIETY ALERT (Sent at ${time}) ⚠️\nMonsoon Saathi Risk assessment indicates SEVERE flooding risk.\n`;
      if (smsSubject === "waterlogging") {
        text += `All residents must move ground floor vehicles to flyovers/ramps immediately. Society drainage pumps are active. Stay indoors.`;
      } else if (smsSubject === "power") {
        text += `Main electrical grid shut down expected due to severe winds. Power off non-essential appliances. Charging battery banks recommended.`;
      } else {
        text += `Heavy downpours expected. Avoid leaving the premises. Keep emergency emergency bags packed. Emergency tree is active.`;
      }
    } else {
      text = `📢 SOCIETY GENERAL NOTICE (Sent at ${time}) 📢\nHeavy rainfall warning is active. Prep measures:\n`;
      if (smsSubject === "waterlogging") {
        text += `Guard team will check basement pumps. Residents requested to clear balcony drain grates. Avoid low-lying lanes.`;
      } else if (smsSubject === "power") {
        text += `Brief power disruptions possible. Keep lifts parked at ground floor. Torch batteries should be verified.`;
      } else {
        text += `Monsoon preparedness checklist is active. Stock dry rations and check on elderly neighbors.`;
      }
    }

    setGeneratedSms(text);
  };

  const handleCopySms = () => {
    if (!generatedSms) return;
    navigator.clipboard.writeText(generatedSms);
    alert("Alert template message copied! You can now paste this directly into your society WhatsApp group.");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Volunteers & Check-in lists (Left side) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Volunteer role assignments */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-teal-400" /> Society Volunteer Roles
          </h3>
          
          <div className="space-y-3">
            {volunteers.map((vol, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-950/40 p-3 rounded-xl border border-slate-900 text-xs">
                <div>
                  <span className="font-semibold text-slate-200 block">{vol.name}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">{vol.role}</span>
                </div>
                <div className="flex items-center gap-3">
                  <a href={`tel:${vol.phone}`} className="text-teal-400 font-bold hover:underline">{vol.phone}</a>
                  <button 
                    onClick={() => handleDeleteVolunteer(idx)}
                    className="p-1 rounded text-red-405 hover:bg-slate-900 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleAddVolunteer} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <input
              type="text"
              required
              value={newVolName}
              onChange={(e) => setNewVolName(e.target.value)}
              placeholder="Volunteer name"
              className="glass-input px-3 py-2 text-xs rounded-xl"
            />
            <input
              type="text"
              required
              value={newVolPhone}
              onChange={(e) => setNewVolPhone(e.target.value)}
              placeholder="10 digit phone"
              className="glass-input px-3 py-2 text-xs rounded-xl"
            />
            <div className="flex gap-2">
              <select
                value={newVolRole}
                onChange={(e) => setNewVolRole(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-2.5 text-[11px] text-slate-300 outline-none"
              >
                <option value="pump_check">Generator/Pump Check</option>
                <option value="first_aid">First Aid Coordinator</option>
                <option value="vulnerable_liaison">Vulnerable liaison</option>
                <option value="sandbag_team">Sandbag Team</option>
              </select>
              <button type="submit" className="p-2.5 bg-teal-500 text-slate-950 rounded-xl font-bold text-xs cursor-pointer">
                Add
              </button>
            </div>
          </form>
        </div>

        {/* Vulnerable residents check list */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
            <ListTodo className="w-4 h-4 text-teal-400" /> Vulnerable Resident Check-in List
          </h3>
          
          <div className="space-y-3">
            {residents.map((res, idx) => (
              <label 
                key={idx}
                className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-all ${
                  res.checked 
                    ? "bg-slate-950/40 border-slate-950 opacity-60 text-slate-500" 
                    : "bg-slate-900/30 border-slate-850"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={res.checked}
                    onChange={() => toggleCheckResident(idx)}
                    className="mt-0.5 w-4 h-4 rounded text-teal-500 accent-teal-500 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className={`font-semibold block ${res.checked ? "line-through text-slate-500" : "text-slate-200"}`}>
                      {res.flat} - {res.name}
                    </span>
                    {res.mobilityNeeded && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-amber-500/20 bg-amber-950/20 text-amber-400 mt-1 inline-block">
                        MOBILITY SUPPORT
                      </span>
                    )}
                  </div>
                </div>
                
                <span className="text-[10px] uppercase font-bold text-slate-500">
                  {res.checked ? "Checked-safe" : "Pending Check"}
                </span>
              </label>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleAddResident} className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <input
              type="text"
              required
              value={newResFlat}
              onChange={(e) => setNewResFlat(e.target.value)}
              placeholder="Flat e.g. A-102"
              className="glass-input px-3 py-2 text-xs rounded-xl"
            />
            <input
              type="text"
              required
              value={newResName}
              onChange={(e) => setNewResName(e.target.value)}
              placeholder="Name/Family specs"
              className="glass-input px-3 py-2 text-xs rounded-xl"
            />
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newResMobility}
                  onChange={(e) => setNewResMobility(e.target.checked)}
                  className="w-4 h-4 accent-teal-500 cursor-pointer"
                />
                <span>Mobility Needs</span>
              </label>
              <button type="submit" className="flex-1 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs cursor-pointer">
                Add Flat
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Alert communication template generator (Right side) */}
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-6 space-y-4 border border-slate-850">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
            <Send className="w-4 h-4 text-teal-400" /> Society Alert Generator
          </h3>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Quickly generate alert notifications that management committees can copy-paste into local messaging groups during weather hazards.
          </p>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Warning Severity</label>
            <select
              value={smsSeverity}
              onChange={(e) => setSmsSeverity(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
            >
              <option value="high">High Caution (Standard storm warning)</option>
              <option value="severe">Critical Emergency (Immediate action required)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Alert Core Topic</label>
            <select
              value={smsSubject}
              onChange={(e) => setSmsSubject(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none"
            >
              <option value="waterlogging">Flooding / Vehicle Protection</option>
              <option value="power">Grid outages / Power banks</option>
              <option value="prep">General preparedness checklist</option>
            </select>
          </div>

          <button
            onClick={handleGenerateSms}
            className="w-full py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold rounded-xl text-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Generate Template Message
          </button>

          {generatedSms && (
            <div className="space-y-3 pt-2">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                {generatedSms}
              </div>
              
              <button
                onClick={handleCopySms}
                className="w-full py-2 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-lg shadow-teal-500/10"
              >
                <Copy className="w-3.5 h-3.5 text-slate-950" /> Copy Alert Text
              </button>
            </div>
          )}
        </div>

        {/* Shared items note */}
        <div className="bg-slate-905/30 border border-slate-900 p-4 rounded-2xl text-[10px] text-slate-500 leading-relaxed space-y-2">
          <span className="font-bold text-slate-350 uppercase tracking-widest block">Building Level Prep Advice</span>
          <p>
            1. Clear stormwater sumps of dry leaves weekly.
          </p>
          <p>
            2. Verify generator diesel supply holds at least 24 hours of fuel backups for elevators and emergency hallway lights.
          </p>
        </div>
      </div>
    </div>
  );
}
