import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

export default async function RootPage() {
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
