import { Shield, Eye, Lock, EyeOff } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Shield className="text-teal-400 w-6 h-6" /> Privacy Policy
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monsoon Saathi is a privacy-first application. Review how your household parameters are processed.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6 text-xs text-slate-350 leading-relaxed">
        {/* Storage */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-teal-400 shrink-0" /> 1. Anonymous Local Storage
          </h3>
          <p>
            Monsoon Saathi does not require emails, user logins, or passwords. All profile metadata is linked 
            to an anonymous session ID stored in a secure, HTTP-only cookie.
          </p>
          <p>
            Your dwelling parameters, children/adult counts, and accessibility markers reside on our local SQLite 
            database. At any time, you can trigger a full database wipe using the Settings controls.
          </p>
        </section>

        {/* AI Sanitization */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <EyeOff className="w-4 h-4 text-teal-400 shrink-0" /> 2. OpenRouter Context Sanitization
          </h3>
          <p>
            When generating personalized preparedness plans, route travel advisories, or clean-up plans, we consult 
            OpenRouter AI models (`nvidia/nemotron-3-ultra-550b-a55b:free`).
          </p>
          <p>
            Before transmission, our sanitization engine filters all profile data. Specifically:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
            <li>Emergency contact names and phone numbers are completely removed.</li>
            <li>Exact street names or society titles are excluded.</li>
            <li>Only basic counts (e.g. 2 adults, pet: true, accessibility: true) are sent to ground the LLM.</li>
            <li>Primary database IDs and cookies are stripped.</li>
          </ul>
        </section>

        {/* Weather data */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-teal-400 shrink-0" /> 3. Weather Forecast Queries
          </h3>
          <p>
            To compile forecasts, geocoding lookups and coordinates are sent to Open-Meteo APIs. Open-Meteo does not 
            require API registration keys, and coordinates are used solely to fetch weather grids. No IP logging or 
            tracking occurs.
          </p>
        </section>

        {/* Advisory limits */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-900 flex items-start gap-2.5 text-[10px] text-slate-500">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong>Official Guidance Notice</strong>: AI advice is for general safety preparations. During severe storms, 
            follow updates broadcast by your municipal corporation and local disaster relief officers.
          </span>
        </div>
      </div>
    </div>
  );
}

import { AlertTriangle } from "lucide-react";
