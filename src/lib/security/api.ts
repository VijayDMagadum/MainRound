import { NextRequest, NextResponse } from "next/server";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

export function getClientKey(req: NextRequest, scope: string): string {
  const forwardedFor = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = req.headers.get("x-real-ip")?.trim();
  return `${scope}:${forwardedFor || realIp || "anonymous"}`;
}

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number; now?: number }
): { allowed: true } | { allowed: false; retryAfterSeconds: number } {
  const now = options.now ?? Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true };
  }

  if (current.count >= options.limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  return { allowed: true };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: "Too many requests. Please wait before trying again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    }
  );
}

export function publicErrorResponse(message = "Internal Server Error", status = 500, error?: unknown) {
  const body: { error: string; details?: string } = { error: message };

  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    body.details = error.message;
  }

  return NextResponse.json(body, { status });
}

export function resetRateLimitForTests() {
  buckets.clear();
}
