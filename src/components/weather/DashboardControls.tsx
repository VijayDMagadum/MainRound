"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Play, ShieldAlert, Sparkles } from "lucide-react";

interface DashboardControlsProps {
  isDemo: boolean;
  locale: string;
}

export default function DashboardControls({ isDemo, locale }: DashboardControlsProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh Next.js server components cache
    router.refresh();
    setTimeout(() => {
      setRefreshing(false);
    }, 1200);
  };

  const handleToggleDemo = () => {
    if (isDemo) {
      // Switch back to normal
      router.push(`/${locale}/dashboard`);
    } else {
      // Enable demo
      router.push(`/${locale}/dashboard?demo=true`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggleDemo}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
          isDemo 
            ? "bg-amber-950/40 border-amber-900/50 text-amber-400" 
            : "bg-slate-900 border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-400"
        }`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        {isDemo ? "Exit Demo" : "Demo Mode"}
      </button>

      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all text-slate-300 disabled:opacity-50 cursor-pointer"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${refreshing ? "animate-spin" : ""}`} />
        <span>{refreshing ? "Syncing..." : "Sync Forecast"}</span>
      </button>
    </div>
  );
}
