"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Settings, 
  User, 
  MapPin, 
  Download, 
  Trash2, 
  Plus, 
  Globe, 
  Phone, 
  Activity, 
  Loader2, 
  CheckCircle 
} from "lucide-react";

export default function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const router = useRouter();
  const [locale, setLocale] = useState("en");
  
  // Loading and profile states
  const [profile, setProfile] = useState<any | null>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states (matching HouseholdProfile properties)
  const [dwellingType, setDwellingType] = useState("apartment");
  const [floorLevel, setFloorLevel] = useState(0);
  const [waterloggingProne, setWaterloggingProne] = useState(false);
  const [nearHazardSource, setNearHazardSource] = useState(false);
  const [hasUpperFloor, setHasUpperFloor] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [olderAdults, setOlderAdults] = useState(0);
  const [pets, setPets] = useState(false);
  const [accessibilityNeeds, setAccessibilityNeeds] = useState(false);
  const [medicalPowerDependent, setMedicalPowerDependent] = useState(false);
  const [vehicleAvailable, setVehicleAvailable] = useState("none");
  const [preferredTravelMode, setPreferredTravelMode] = useState("public");

  // Secondary location adding states
  const [newLocName, setNewLocName] = useState("");
  const [newLocLat, setNewLocLat] = useState("");
  const [newLocLon, setNewLocLon] = useState("");
  const [addingLoc, setAddingLoc] = useState(false);

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
    loadData();
  }, [params]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, locationsRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/profile/locations")
      ]);

      if (profileRes.ok) {
        const pData = await profileRes.json();
        if (pData) {
          setProfile(pData);
          setDwellingType(pData.dwellingType);
          setFloorLevel(pData.floorLevel);
          setWaterloggingProne(pData.waterloggingProne);
          setNearHazardSource(pData.nearHazardSource);
          setHasUpperFloor(pData.hasUpperFloor);
          setAdults(pData.adults);
          setChildren(pData.children);
          setOlderAdults(pData.olderAdults);
          setPets(pData.pets);
          setAccessibilityNeeds(pData.accessibilityNeeds);
          setMedicalPowerDependent(pData.medicalPowerDependent);
          setVehicleAvailable(pData.vehicleAvailable);
          setPreferredTravelMode(pData.preferredTravelMode);
        }
      }

      if (locationsRes.ok) {
        const lData = await locationsRes.json();
        setLocations(lData || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dwellingType,
          floorLevel,
          waterloggingProne,
          nearHazardSource,
          hasUpperFloor,
          adults,
          children,
          olderAdults,
          pets,
          accessibilityNeeds,
          medicalPowerDependent,
          vehicleAvailable,
          preferredTravelMode,
          emergencyContacts: profile?.emergencyContacts || "[]",
          preferredLanguage: locale
        })
      });

      if (res.ok) {
        // Clear cached plans to force regeneration with updated details
        localStorage.removeItem("preparednessPlan");
        alert("Household Profile updated successfully!");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving profile.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName || !newLocLat || !newLocLon) return;

    setAddingLoc(true);
    try {
      const res = await fetch("/api/profile/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newLocName,
          latitude: parseFloat(newLocLat),
          longitude: parseFloat(newLocLon),
          isPrimary: false
        })
      });

      if (res.ok) {
        setNewLocName("");
        setNewLocLat("");
        setNewLocLon("");
        loadData(); // Reload list
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAddingLoc(false);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm("Remove this saved location?")) return;
    try {
      const res = await fetch(`/api/profile/locations?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        loadData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportData = async () => {
    try {
      const res = await fetch("/api/profile/export");
      if (res.ok) {
        const fullData = await res.json();
        const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Monsoon_Saathi_Full_Data_Export.json`;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error(e);
      alert("Export failed.");
    }
  };

  const handleWipeAll = async () => {
    if (!confirm("CRITICAL WARNING: This will permanently delete your profile, saved locations, checklists, and local browser caches. This cannot be undone. Proceed?")) return;
    try {
      const res = await fetch("/api/profile", { method: "DELETE" });
      if (res.ok) {
        localStorage.clear();
        window.location.href = "/";
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="h-64 bg-slate-900/40 rounded-2xl animate-pulse flex items-center justify-center border border-slate-950">
        <span className="text-xs text-slate-500">Retrieving configuration settings...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Profile Form (Left side) */}
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={handleSaveProfile} className="glass-card rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-1.5 border-b border-slate-900 pb-3">
            <User className="text-teal-400 w-5 h-5" /> Household Profile Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Dwelling Type</label>
              <select
                value={dwellingType}
                onChange={(e) => setDwellingType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-teal-500 outline-none"
              >
                <option value="apartment">Apartment</option>
                <option value="house">Independent House</option>
                <option value="temporary">Informal / Temporary Structure</option>
                <option value="hostel">Hostel</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Floor Level</label>
              <input
                type="number"
                value={floorLevel}
                onChange={(e) => setFloorLevel(parseInt(e.target.value) || 0)}
                className="w-full glass-input px-3.5 py-2 text-xs rounded-xl outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Adults</label>
              <input
                type="number"
                value={adults}
                onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                className="w-full glass-input px-3 py-2 text-xs rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Children</label>
              <input
                type="number"
                value={children}
                onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                className="w-full glass-input px-3 py-2 text-xs rounded-xl outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Elders</label>
              <input
                type="number"
                value={olderAdults}
                onChange={(e) => setOlderAdults(parseInt(e.target.value) || 0)}
                className="w-full glass-input px-3 py-2 text-xs rounded-xl outline-none"
              />
            </div>
          </div>

          {/* Checks */}
          <div className="space-y-3 pt-2 border-t border-slate-900">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={waterloggingProne}
                onChange={(e) => setWaterloggingProne(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 accent-teal-500 cursor-pointer"
              />
              <span className="text-xs text-slate-350">Compound is prone to waterlogging</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={nearHazardSource}
                onChange={(e) => setNearHazardSource(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 accent-teal-500 cursor-pointer"
              />
              <span className="text-xs text-slate-350">Dwelling is near river / open drain / sea coast</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasUpperFloor}
                onChange={(e) => setHasUpperFloor(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 accent-teal-500 cursor-pointer"
              />
              <span className="text-xs text-slate-350">Have immediate access to safe upper floor height</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pets}
                onChange={(e) => setPets(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 accent-teal-500 cursor-pointer"
              />
              <span className="text-xs text-slate-350">Have pets in household</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accessibilityNeeds}
                onChange={(e) => setAccessibilityNeeds(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 accent-teal-500 cursor-pointer"
              />
              <span className="text-xs text-slate-350">Someone requires mobility / accessibility assistance</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={medicalPowerDependent}
                onChange={(e) => setMedicalPowerDependent(e.target.checked)}
                className="w-4 h-4 rounded text-teal-500 accent-teal-500 cursor-pointer"
              />
              <span className="text-xs text-slate-350">Electricity dependent for medical equipment</span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-900">
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Commute Vehicle</label>
              <select
                value={vehicleAvailable}
                onChange={(e) => setVehicleAvailable(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-teal-500 outline-none"
              >
                <option value="none">No vehicle</option>
                <option value="2wheeler">Two Wheeler</option>
                <option value="4wheeler">Four Wheeler</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-350 uppercase tracking-widest font-semibold">Preferred Transit Mode</label>
              <select
                value={preferredTravelMode}
                onChange={(e) => setPreferredTravelMode(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-teal-500 outline-none"
              >
                <option value="public">Public transit (Train/Bus)</option>
                <option value="private">Private Driving</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-teal-500/10"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 text-slate-950" />}
            Save Profile Updates
          </button>
        </form>
      </div>

      {/* Locations management & Data export (Right side) */}
      <div className="space-y-6">
        {/* Locations List */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border border-slate-850">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-teal-400" /> Saved Locations
          </h3>
          
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {locations.map(loc => (
              <div key={loc.id} className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-900 text-xs">
                <div className="truncate pr-2">
                  <span className="font-semibold text-slate-200 block truncate">{loc.name}</span>
                  <span className="text-[9px] text-slate-500 block mt-0.5 font-mono">
                    {loc.isPrimary ? "PRIMARY LOCATION" : `${loc.latitude.toFixed(2)}°N, ${loc.longitude.toFixed(2)}°E`}
                  </span>
                </div>
                {!loc.isPrimary && (
                  <button
                    onClick={() => handleDeleteLocation(loc.id)}
                    className="p-1 text-red-400 hover:bg-slate-900 rounded cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAddLocation} className="space-y-2 pt-2 border-t border-slate-900">
            <span className="text-[10px] uppercase font-bold text-slate-550 tracking-wider">Add Secondary Location</span>
            <input
              type="text"
              required
              value={newLocName}
              onChange={(e) => setNewLocName(e.target.value)}
              placeholder="e.g. Office compound"
              className="w-full glass-input px-3.5 py-1.5 text-xs rounded-xl"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                required
                value={newLocLat}
                onChange={(e) => setNewLocLat(e.target.value)}
                placeholder="Lat e.g. 19.08"
                className="w-full glass-input px-3 py-1.5 text-xs rounded-xl"
              />
              <input
                type="number"
                step="any"
                required
                value={newLocLon}
                onChange={(e) => setNewLocLon(e.target.value)}
                placeholder="Lon e.g. 72.87"
                className="w-full glass-input px-3 py-1.5 text-xs rounded-xl"
              />
            </div>
            <button
              type="submit"
              disabled={addingLoc}
              className="w-full py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-xs font-semibold rounded-xl text-slate-300 cursor-pointer"
            >
              {addingLoc ? "Adding..." : "Add Coordinates"}
            </button>
          </form>
        </div>

        {/* Data Tools */}
        <div className="glass-card rounded-2xl p-6 space-y-4 border border-slate-850">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-teal-400" /> Personal Data Tools
          </h3>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Manage your local database session data. Check profiles, exported files, or trigger wipes.
          </p>

          <div className="space-y-2.5">
            <button
              onClick={handleExportData}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-teal-400" /> Export All Data (JSON)
            </button>
            
            <button
              onClick={handleWipeAll}
              className="w-full py-2.5 bg-red-950/15 hover:bg-red-950/30 border border-red-900/35 rounded-xl text-xs font-bold text-red-400 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4 text-red-500" /> Wipe Session Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
