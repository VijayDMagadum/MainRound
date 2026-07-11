import { cookies } from "next/headers";
import { prisma } from "./prisma";

export async function getSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sessionId = cookieStore.get("session_id")?.value;

  if (!sessionId) {
    try {
      const session = await prisma.userSession.create({ data: {} });
      sessionId = session.id;
      try {
        cookieStore.set("session_id", sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 365, // 1 year
          path: "/",
        });
      } catch (cookieErr) {
        // Safe to ignore in Server Component render context.
      }
    } catch (e) {
      console.error("Failed to create anonymous database session:", e);
      // Fallback to random ID if database is locked or failing, to ensure app works
      sessionId = crypto.randomUUID();
    }
  }

  return sessionId;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session_id")?.value;

  if (sessionId) {
    try {
      await prisma.userSession.delete({
        where: { id: sessionId },
      }).catch(() => {});
    } catch (e) {}
  }

  cookieStore.delete("session_id");
}
