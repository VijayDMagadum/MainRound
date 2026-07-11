import RecoveryPlanner from "@/components/recovery/RecoveryPlanner";
import { getSessionId } from "@/lib/db/session";
import { prisma } from "@/lib/db/prisma";
import { connection } from "next/server";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const runtime = "nodejs";

export default async function RecoveryPage({ params }: PageProps) {
  await connection();

  const { locale } = await params;
  const sessionId = await getSessionId();

  let profile = null;
  try {
    profile = await prisma.householdProfile.findUnique({
      where: { sessionId },
    });
  } catch (e) {
    console.error("Database connection failure in recovery:", e);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Post-Storm Recovery Planner</h1>
        <p className="text-xs text-slate-400 mt-1">
          Generate safety guides for structural entry, electrical circuit clearance, mold prevention, and utility restoration.
        </p>
      </div>

      <RecoveryPlanner 
        household={profile}
        locale={locale}
      />
    </div>
  );
}
