import { getSessionId } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { getForecast } from "@/lib/weather/open-meteo";
import AssistantChat from "@/components/assistant/AssistantChat";
import { connection } from "next/server";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const runtime = "nodejs";

export default async function AssistantPage({ params }: PageProps) {
  await connection();

  const { locale } = await params;
  const sessionId = await getSessionId();

  let profile = null;
  let forecast = null;

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
  } catch (e) {
    console.error("Database connection failure in assistant page load:", e);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">AI Safety Assistant</h1>
        <p className="text-xs text-slate-400 mt-1">
          Resolve questions regarding compound waterlogging, storm checklists, travel timings, and post-flood restoration.
        </p>
      </div>

      <AssistantChat 
        householdProfile={profile}
        weatherForecast={forecast}
        locale={locale}
      />
    </div>
  );
}
