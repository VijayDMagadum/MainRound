import { Info, CloudRain, ShieldCheck, Heart } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          <Info className="text-teal-400 w-6 h-6" /> About Monsoon Saathi
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Learn about our mission to democratize Generative-AI preparedness for severe monsoon hazard windows.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 md:p-8 space-y-6 text-xs text-slate-355 leading-relaxed">
        {/* Concept */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <CloudRain className="w-4 h-4 text-teal-400 shrink-0" /> Mission Statement
          </h3>
          <p>
            Monsoon weather in South Asia often creates sudden heavy rainfall, flash floods, and electrical grid failures. 
            Monsoon Saathi was built to provide citizens with high-precision, safety-grounded resources offline.
          </p>
          <p>
            By combining a rules-based weather risk engine with secure LLM APIs, we generate customized 
            preparedness guidelines, travel warnings, and cleanup instructions instantly.
          </p>
        </section>

        {/* Risk warning difference */}
        <section className="space-y-2 border-t border-slate-900 pt-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" /> Calculated Risk vs. Official Warnings
          </h3>
          <p>
            <strong>Critical distinction:</strong> All risk flags (low, moderate, high, severe) visible on our dashboards 
            are estimated by our deterministic risk calculations. 
          </p>
          <p>
            These are NOT official government red/amber alerts. They are designed to act as advanced precautions 
            matching your dwelling structure. In all cases, official instructions from local disaster management 
            boards take priority.
          </p>
        </section>

        {/* Technology Stack */}
        <section className="space-y-2 border-t border-slate-900 pt-4">
          <h3 className="text-sm font-bold text-slate-200">Our Technology Stack</h3>
          <p>
            Monsoon Saathi is built using:
          </p>
          <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
            <li><strong>Framework</strong>: Next.js (App Router) & TypeScript</li>
            <li><strong>Database</strong>: SQLite with Prisma ORM</li>
            <li><strong>AI</strong>: OpenRouter API (`nvidia/nemotron-3-ultra-550b-a55b:free`)</li>
            <li><strong>Weather</strong>: Open-Meteo geocoding and forecasting API</li>
            <li><strong>PWA</strong>: Service Workers and Manifest caching</li>
          </ul>
        </section>

        {/* Footer */}
        <div className="flex justify-center items-center gap-1.5 pt-4 text-[10px] text-slate-500 border-t border-slate-900">
          <span>Made with</span>
          <Heart className="w-3 h-3 text-red-500 fill-red-500 shrink-0" />
          <span>for safer monsoons.</span>
        </div>
      </div>
    </div>
  );
}
