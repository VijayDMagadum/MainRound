import { getSessionId } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { getForecast } from "@/lib/weather/open-meteo";
import PreparednessPlanView from "@/components/preparedness/PreparednessPlanView";
import { connection } from "next/server";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const runtime = "nodejs";

export default async function PreparednessPage({ params }: PageProps) {
  await connection();

  const { locale } = await params;
  const sessionId = await getSessionId();

  let profile = null;
  let forecast = null;
  let locations: any[] = [];

  try {
    profile = await prisma.householdProfile.findUnique({
      where: { sessionId },
    });
    const primaryLocation = await prisma.savedLocation.findFirst({
      where: { sessionId, isPrimary: true },
    });

    if (primaryLocation) {
      forecast = await getForecast(primaryLocation.latitude, primaryLocation.longitude);
    }

    // Load all saved locations for switcher
    locations = await prisma.savedLocation.findMany({
      where: { sessionId },
      orderBy: { isPrimary: "desc" }
    });
  } catch (e) {
    console.error("Database connection failure in preparedness loading:", e);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Personalized Preparedness Plan</h1>
        <p className="text-xs text-slate-400 mt-1">
          Review emergency steps structured for your household dwelling, accessibility status, and weather forecasts.
        </p>
      </div>

      <PreparednessPlanView 
        household={profile}
        forecast={forecast}
        locale={locale}
        locations={locations || []}
      />
    </div>
  );
}
