import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export default async function RootPage() {
  await connection();

  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;
  
  let targetLocale = "en";
  let onboardingCompleted = false;

  if (sessionId) {
    try {
      const profile = await prisma.householdProfile.findUnique({
        where: { sessionId },
      });
      if (profile) {
        onboardingCompleted = true;
        targetLocale = profile.preferredLanguage || "en";
      }
    } catch (e) {
      console.error("Database connection issue in root redirect:", e);
    }
  }

  // Redirect to landing page or dashboard
  if (onboardingCompleted) {
    redirect(`/${targetLocale}/dashboard`);
  } else {
    redirect(`/${targetLocale}`);
  }
}
