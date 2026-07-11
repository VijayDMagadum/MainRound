import { getSessionId } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { getForecast } from "@/lib/weather/open-meteo";
import { calculateRisk, maxRisk } from "@/lib/weather/risk-engine";
import { getDictionary } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import DashboardLocationLoader from "@/components/layout/DashboardLocationLoader";
import Link from "next/link";
import RainfallChart from "@/components/weather/RainfallChart";
import DashboardControls from "@/components/weather/DashboardControls";
import { 
  CloudRain, 
  Compass, 
  ShieldAlert, 
  MapPin, 
  CheckSquare, 
  MessageSquare, 
  Phone,
  AlertTriangle,
  Clock,
  Volume2
} from "lucide-react";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export const runtime = "nodejs";

export default async function DashboardPage({ params, searchParams }: PageProps) {
  await connection();

  const { locale } = await params;
  const sParams = await searchParams;
  const isDemo = sParams.demo === "true";
  
  const dict = getDictionary(locale);
  const sessionId = await getSessionId();

  let profile = null;
  let primaryLocation = null;
  let weatherData = null;
  let checklistItems: any[] = [];
  let userObs: any[] = [];

  let showLoader = false;

  if (isDemo) {
    // 1. Setup Demo Mock Profile
    profile = {
      dwellingType: "apartment",
      floorLevel: 0,
      waterloggingProne: true,
      nearHazardSource: true,
      hasUpperFloor: true,
      adults: 2,
      children: 1,
      olderAdults: 1,
      pets: true,
      accessibilityNeeds: true,
      medicalPowerDependent: true,
      vehicleAvailable: "4wheeler",
      preferredTravelMode: "private",
      preferredLanguage: locale,
    };

    primaryLocation = {
      name: "Mumbai (Demo Mode)",
      latitude: 19.0760,
      longitude: 72.8777,
    };

    // Simulated storm weather data
    const mockHours = [];
    const baseTime = Date.now();
    for (let i = 0; i < 72; i++) {
      mockHours.push(new Date(baseTime + i * 60 * 60 * 1000).toISOString());
    }

    weatherData = {
      latitude: 19.0760,
      longitude: 72.8777,
      timezone: "Asia/Kolkata",
      current: {
        temperature_2m: 24.5,
        apparent_temperature: 28.2,
        relative_humidity_2m: 95,
        precipitation: 18.5,
        rain: 18.5,
        showers: 0,
        weather_code: 95, // Thunderstorm
        visibility: 800, // Very low visibility
        wind_speed_10m: 35.0,
        wind_gusts_10m: 68.0,
      },
      hourly: {
        time: mockHours,
        temperature_2m: Array(72).fill(24.5),
        apparent_temperature: Array(72).fill(28.2),
        precipitation_probability: Array(72).fill(90),
        precipitation: Array(72).fill(12.5),
        weather_code: Array(72).fill(95),
        visibility: Array(72).fill(800),
        wind_speed_10m: Array(72).fill(35.0),
        wind_gusts_10m: Array(72).fill(68.0),
      },
      daily: {
        time: [new Date().toISOString().split("T")[0]],
        temperature_2m_max: [27.0],
        temperature_2m_min: [23.5],
        precipitation_sum: [120.0], // 120mm heavy daily rain
        precipitation_probability_max: [95],
        wind_gusts_10m_max: [70.0],
        sunrise: [new Date().toISOString()],
        sunset: [new Date().toISOString()],
        weather_code: [95],
      },
      lastUpdated: new Date().toISOString(),
    };

    // Precompiled demo checklist
    checklistItems = [
      { id: "demo-item-1", title: "Emergency Water (Bottled)", description: "3 liters per day per person.", quantity: "36L", isCompleted: true, category: "water" },
      { id: "demo-item-2", title: "Charge Mobile Phones & Power banks", description: "Grid outage preparation.", quantity: "2 units", isCompleted: true, category: "communication" },
      { id: "demo-item-3", title: "Pack Go-Bag with documents", description: "Keep IDs in waterproof bags.", quantity: "1 go-bag", isCompleted: false, category: "documents" },
      { id: "demo-item-4", title: "Verify pet food stocks", description: "Extra dog food in dry container.", quantity: "3-day supply", isCompleted: false, category: "pets" },
    ];

    userObs = [
      { id: "demo-obs-1", hazardType: "waterlogging", severity: "high", location: "Dharavi Junction", description: "Water accumulating up to knees. Traffic diverted." }
    ];
  } else {
    // Load from database
    try {
      profile = await prisma.householdProfile.findUnique({
        where: { sessionId },
      });
      primaryLocation = await prisma.savedLocation.findFirst({
        where: { sessionId, isPrimary: true },
      });
      
      if (!primaryLocation) {
        showLoader = true;
      } else {
        // Fetch weather
        weatherData = await getForecast(primaryLocation.latitude, primaryLocation.longitude);
        
        // Load checklist progress
        checklistItems = await prisma.checklistItem.findMany({
          where: { sessionId },
        });

        // Load active observation reports
        userObs = await prisma.userObservation.findMany({
          orderBy: { createdAt: "desc" },
          take: 3
        });
      }
    } catch (e) {
      console.error("Database connection issue in dashboard:", e);
    }
  }

  if (showLoader) {
    return <DashboardLocationLoader locale={locale} />;
  }

  // Calculate overall risk
  const riskAssessment = calculateRisk(weatherData, profile as any, userObs);

  // Compute checklist completeness
  const completedCount = checklistItems.filter(item => item.isCompleted).length;
  const totalCount = checklistItems.length || 1;
  const checklistCompletionPct = Math.round((completedCount / totalCount) * 100);

  // Risk styling mappings
  const riskStyles: Record<string, { bg: string; text: string; border: string }> = {
    low: { bg: "bg-emerald-950/40", text: "text-emerald-400", border: "border-emerald-500/30" },
    moderate: { bg: "bg-blue-950/40", text: "text-blue-400", border: "border-blue-500/30" },
    high: { bg: "bg-amber-950/40", text: "text-amber-400", border: "border-amber-500/30" },
    severe: { bg: "bg-red-950/40", text: "text-red-400", border: "border-red-500/30" },
  };

  const style = riskStyles[riskAssessment.overall] || riskStyles.low;

  return (
    <div className="space-y-6">
      {/* Dashboard Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-slate-900 rounded-2xl p-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-100">
            <MapPin className="text-teal-400 w-5 h-5 shrink-0" />
            {primaryLocation?.name || "Target Location"}
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Coordinates: {primaryLocation?.latitude.toFixed(4)}°N, {primaryLocation?.longitude.toFixed(4)}°E 
            {weatherData && ` | ${dict.common.lastUpdated}: ${new Date(weatherData.lastUpdated).toLocaleTimeString(locale)}`}
          </p>
        </div>
        
        {/* Sync Controls (Demo Switchers / Manual Refresh) */}
        <DashboardControls isDemo={isDemo} locale={locale} />
      </div>

      {isDemo && (
        <div className="bg-amber-950/40 border border-amber-900/50 text-amber-400 p-3.5 rounded-2xl flex items-start gap-3">
          <Volume2 className="w-5 h-5 mt-0.5 shrink-0 animate-bounce" />
          <div className="text-xs">
            <strong>{dict.common.demoMode}</strong>: You are viewing a simulated heavy rainfall storm scenario in Mumbai. Physical database writes and AI answers are simulated where API keys are absent.
          </div>
        </div>
      )}

      {/* Grid: Risk engine summary, Current weather */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk summary */}
        <div className={`md:col-span-2 glass-card rounded-2xl border p-6 flex flex-col justify-between ${style.border}`}>
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{dict.common.riskLabel}</span>
                <h3 className={`text-3xl font-extrabold uppercase mt-1 ${style.text}`}>{riskAssessment.overall}</h3>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${style.border} ${style.bg} ${style.text}`}>
                {riskAssessment.confidence.toUpperCase()} CONFIDENCE
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-350 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Key Safety Observations
              </h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-400 text-xs leading-relaxed">
                {riskAssessment.reasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900 flex items-center justify-between text-xs mt-6">
            <span className="text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Valid to: {new Date(riskAssessment.validUntil).toLocaleTimeString()}
            </span>
            <span className="text-slate-400 text-[10px]">Estimated by Saathi Risk Engine. Not an official warning.</span>
          </div>
        </div>

        {/* Current Conditions card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Weather Feed</span>
            <div className="flex items-center justify-between mt-3">
              <span className="text-4xl font-extrabold">{weatherData?.current.temperature_2m.toFixed(1)}°C</span>
              <span className="text-xs text-slate-400">Feels like: {weatherData?.current.apparent_temperature.toFixed(1)}°C</span>
            </div>
            
            <div className="border-t border-slate-900 my-4"></div>

            <div className="space-y-2.5 text-xs text-slate-350">
              <div className="flex justify-between">
                <span>Humidity:</span>
                <span className="font-semibold text-slate-100">{weatherData?.current.relative_humidity_2m}%</span>
              </div>
              <div className="flex justify-between">
                <span>Wind Speed:</span>
                <span className="font-semibold text-slate-100">{weatherData?.current.wind_speed_10m.toFixed(0)} km/h</span>
              </div>
              <div className="flex justify-between">
                <span>Wind Gusts:</span>
                <span className="font-semibold text-slate-100">{weatherData?.current.wind_gusts_10m.toFixed(0)} km/h</span>
              </div>
              <div className="flex justify-between">
                <span>Precipitation:</span>
                <span className="font-semibold text-teal-400">{weatherData?.current.precipitation.toFixed(1)} mm</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 flex items-center gap-2.5 text-xs">
            <CloudRain className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <span className="block font-medium text-slate-300">Open-Meteo API</span>
              <span className="block text-[10px] text-slate-500">Live coordinates lookup</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recharts rainfall graph */}
      {weatherData && (
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="font-bold text-md text-slate-100">{dict.dashboard.chartTitle}</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Displays expected hourly rain amounts and temperatures over the next 24 hours.</p>
          </div>
          <RainfallChart
            hourlyTimes={weatherData.hourly.time}
            precipProb={weatherData.hourly.precipitation_probability}
            precipitation={weatherData.hourly.precipitation}
            temperature={weatherData.hourly.temperature_2m}
            locale={locale}
          />
        </div>
      )}

      {/* Grid: Actions checklist progress, AI Assistant link */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Checklist Progress */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-teal-400" /> Safety Checklist
              </h3>
              <span className="text-xs text-teal-400 font-bold">{checklistCompletionPct}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-teal-500 to-cyan-400 h-1.5 rounded-full transition-all duration-550"
                style={{ width: `${checklistCompletionPct}%` }}
              ></div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {checklistItems.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-start gap-2.5 text-xs text-slate-400">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${item.isCompleted ? "bg-teal-400" : "bg-slate-700"}`}></div>
                <span className={item.isCompleted ? "line-through text-slate-600" : ""}>{item.title}</span>
              </div>
            ))}
          </div>

          <Link
            href={`/${locale}/checklist`}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-center text-xs font-semibold rounded-xl border border-slate-800 transition-colors cursor-pointer"
          >
            Manage Safety Checklist ({completedCount}/{totalCount})
          </Link>
        </div>

        {/* AI Quick Assistant */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-teal-400" /> Monsoon Saathi AI
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ask localized questions regarding flood cleanup, travel precautions, or society preparedness templates.
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 flex flex-col gap-1.5 text-xs">
            <span className="text-slate-450 italic">Try asking:</span>
            <Link href={`/${locale}/assistant?q=What should I keep in an emergency bag?`} className="text-teal-400 hover:underline">
              "What should I keep in an emergency bag?"
            </Link>
            <Link href={`/${locale}/assistant?q=How can our society coordinate?`} className="text-teal-400 hover:underline">
              "How can our society coordinate during storms?"
            </Link>
          </div>

          <Link
            href={`/${locale}/assistant`}
            className="w-full py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 text-center text-xs font-extrabold rounded-xl transition-all cursor-pointer"
          >
            Consult AI Assistant
          </Link>
        </div>

        {/* Local Emergency contacts card */}
        <div className="glass-card rounded-2xl p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-teal-400" /> Offline Helplines
            </h3>
            <p className="text-xs text-slate-400">Essential services numbers saved offline in case of cellular data dropouts.</p>
          </div>

          <div className="space-y-2.5 text-xs text-slate-350 pr-1 max-h-36 overflow-y-auto">
            <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
              <div>
                <span className="font-semibold text-slate-200 block">National Disaster Response Force</span>
                <span className="text-[10px] text-slate-500 block">NDRF Emergency Control</span>
              </div>
              <a href="tel:01123438087" className="text-teal-400 font-bold hover:underline">011-23438087</a>
            </div>
            <div className="flex justify-between items-center bg-slate-950/40 p-2.5 rounded-xl border border-slate-900">
              <div>
                <span className="font-semibold text-slate-200 block">NDMA Central Helpline</span>
                <span className="text-[10px] text-slate-500 block">Disaster Helpline</span>
              </div>
              <a href="tel:1078" className="text-teal-400 font-bold hover:underline">1078</a>
            </div>
          </div>

          <Link
            href={`/${locale}/settings`}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 text-center text-xs font-semibold rounded-xl border border-slate-800 transition-colors cursor-pointer"
          >
            Edit Custom Contacts
          </Link>
        </div>
      </div>
    </div>
  );
}
