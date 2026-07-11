"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Globe, ShieldAlert, WifiOff, RefreshCw, Trash2, CheckCircle } from "lucide-react";

interface HeaderControlsProps {
  locale: string;
}

export default function HeaderControls({ locale }: HeaderControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(true);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wiping, setWiping] = useState(false);

  // Monitor connectivity state
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  // Handle changing locales by swapping URL prefix
  const changeLocale = (newLocale: string) => {
    setShowLangMenu(false);
    if (!pathname) return;
    
    const pathParts = pathname.split("/");
    // pathParts[1] is the current locale (e.g. "en", "hi", "mr")
    pathParts[1] = newLocale;
    const newPath = pathParts.join("/");
    
    router.push(newPath);
  };

  // Perform full database & local session data reset
  const handleWipeData = async () => {
    setWiping(true);
    try {
      const res = await fetch("/api/profile", {
        method: "DELETE",
      });
      if (res.ok) {
        // Clear all localStorage entries
        localStorage.clear();
        // Redirect to homepage
        window.location.href = "/";
      } else {
        alert("Failed to delete server-side profile data.");
      }
    } catch (e) {
      console.error(e);
      alert("Error clearing session data.");
    } finally {
      setWiping(false);
      setShowWipeConfirm(false);
    }
  };

  return (
    <div className="flex items-center gap-3 relative">
      {/* Offline Status Badge */}
      {!isOnline && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/60 border border-amber-900/60 text-amber-400 animate-pulse">
          <WifiOff className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Offline Mode</span>
        </div>
      )}

      {/* Language Selector Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowLangMenu(!showLangMenu)}
          aria-label="Toggle language menu"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 rounded-xl transition-all cursor-pointer"
          title="Change language"
        >
          <Globe className="w-3.5 h-3.5 text-teal-400" />
          <span className="uppercase text-slate-300">{locale}</span>
        </button>

        {showLangMenu && (
          <div className="absolute right-0 mt-2 w-32 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 p-1 flex flex-col space-y-0.5">
            <button
              onClick={() => changeLocale("en")}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                locale === "en" ? "bg-teal-950/40 text-teal-400 font-bold" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              English (EN)
            </button>
            <button
              onClick={() => changeLocale("hi")}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                locale === "hi" ? "bg-teal-950/40 text-teal-400 font-bold" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              हिंदी (HI)
            </button>
            <button
              onClick={() => changeLocale("mr")}
              className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors cursor-pointer ${
                locale === "mr" ? "bg-teal-950/40 text-teal-400 font-bold" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              मराठी (MR)
            </button>
          </div>
        )}
      </div>

      {/* Reset Session / Wipe Data Button */}
      <button
        onClick={() => setShowWipeConfirm(true)}
        aria-label="Wipe session and profile data"
        className="flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-900/50 border border-transparent hover:border-slate-800/80 transition-all cursor-pointer"
        title="Wipe all data"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Wipe Confirmation Dialog */}
      {showWipeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 max-w-sm w-full rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-md font-bold text-slate-100">Wipe Stored Safety Profile?</h3>
            </div>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              This action will permanently delete your household profile, emergency contacts, saved locations, 
              local weather snapshots, and checklists. This cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 text-xs">
              <button
                onClick={() => setShowWipeConfirm(false)}
                className="px-4 py-2 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-350 cursor-pointer"
                disabled={wiping}
              >
                Cancel
              </button>
              <button
                onClick={handleWipeData}
                className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-xl font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                disabled={wiping}
              >
                {wiping ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {wiping ? "Wiping..." : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
