import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { 
  CloudRain, 
  ShieldAlert, 
  MapPin, 
  MessageSquare, 
  Activity, 
  CheckSquare, 
  Smartphone,
  EyeOff
} from "lucide-react";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function LandingPage({ params }: PageProps) {
  const { locale } = await params;
  const dict = getDictionary(locale);

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center py-6 md:py-12">
      {/* Hero Section */}
      <div className="text-center max-w-3xl space-y-6 px-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-950/40 border border-teal-500/30 text-teal-400">
          <Activity className="w-3.5 h-3.5" />
          <span>{dict.common.tagline}</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
          Prepare, Respond, and Recover with{" "}
          <span className="bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Monsoon Saathi
          </span>
        </h1>

        <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
          Protect your household from thunderstorms, flash floods, and waterlogging. Get weather-aware emergency 
          checklists, multilingual AI assistance, offline-ready safety plans, and crowd-sourced citizen hazard alerts.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href={`/${locale}/onboarding`}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 text-sm font-bold rounded-2xl shadow-xl shadow-teal-500/10 hover:shadow-teal-500/20 active:scale-98 transition-all text-center cursor-pointer"
          >
            {dict.onboarding.getStarted}
          </Link>
          <Link
            href={`/${locale}/dashboard?demo=true`}
            className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 hover:bg-slate-850 text-slate-200 text-sm font-semibold rounded-2xl border border-slate-800 hover:border-slate-700 active:scale-98 transition-all text-center cursor-pointer"
          >
            {dict.onboarding.useDemo}
          </Link>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-16 md:mt-24 px-4">
        {/* Card 1 */}
        <div className="glass-card p-6 rounded-2xl space-y-3">
          <div className="bg-teal-500/10 text-teal-400 p-2.5 rounded-xl border border-teal-500/20 w-fit">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-100">Weather-Aware Risk Engine</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Calculates high-precision risk variables (winds, rainfall, visibility) and pairs them with your home dwelling type and flood vulnerability.
          </p>
        </div>

        {/* Card 2 */}
        <div className="glass-card p-6 rounded-2xl space-y-3">
          <div className="bg-teal-500/10 text-teal-400 p-2.5 rounded-xl border border-teal-500/20 w-fit">
            <Smartphone className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-100">PWA & 100% Offline Access</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Install Monsoon Saathi as an app. Access saved family preparedness checklists, contacts, and weather safety guidelines during grid failures.
          </p>
        </div>

        {/* Card 3 */}
        <div className="glass-card p-6 rounded-2xl space-y-3">
          <div className="bg-teal-500/10 text-teal-400 p-2.5 rounded-xl border border-teal-500/20 w-fit">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg text-slate-100">Multilingual Conversational AI</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Ask safety queries and get plans compiled in English, Hindi, and Marathi. Grounded in deterministic risk assessments to prevent AI hallucinations.
          </p>
        </div>
      </div>

      {/* Privacy Section */}
      <div className="mt-16 md:mt-24 bg-slate-900/40 border border-slate-900 rounded-2xl p-6 max-w-3xl text-center space-y-3 mx-4">
        <div className="flex items-center justify-center gap-2 text-teal-400 font-semibold text-sm">
          <EyeOff className="w-4 h-4" />
          <span>Privacy First, No Accounts Required</span>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed max-w-xl mx-auto">
          We do not require emails, phone numbers, or passwords. Your profile is stored in a secure local database session. 
          Phone numbers and exact coordinates are strictly scrubbed before contacting OpenRouter APIs.
        </p>
      </div>
    </div>
  );
}
