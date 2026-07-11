import { prisma } from "@/lib/db/prisma";
import { getForecast } from "@/lib/weather/open-meteo";
import { calculateRisk } from "@/lib/weather/risk-engine";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

export async function GET(req: NextRequest) {
  console.log("[API/Cron/CheckAlerts] Starting automated alerts check...");

  // 1. Authenticate with CRON_SECRET if configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    const searchParamToken = req.nextUrl.searchParams.get("token");
    const providedToken = authHeader?.replace("Bearer ", "") || searchParamToken;

    if (providedToken !== cronSecret) {
      console.warn("[API/Cron/CheckAlerts] Unauthorized cron attempt blocked.");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Configure web-push keys if present
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@monsoonsaathi.org";
  
  let pushConfigured = false;
  if (vapidPublicKey && vapidPrivateKey) {
    try {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      pushConfigured = true;
    } catch (e) {
      console.error("[API/Cron/CheckAlerts] Failed to initialize web-push credentials:", e);
    }
  }

  try {
    // 2. Fetch all primary saved locations
    const primaryLocations = await prisma.savedLocation.findMany({
      where: { isPrimary: true },
      include: {
        session: {
          include: {
            profile: true,
            pushSubscriptions: true
          }
        }
      }
    });

    console.log(`[API/Cron/CheckAlerts] Found ${primaryLocations.length} locations to check.`);

    let alertsGeneratedCount = 0;
    let pushNotificationsSentCount = 0;

    for (const location of primaryLocations) {
      const { latitude, longitude, sessionId, name: locationName } = location;
      const household = location.session.profile;

      // 3. Fetch latest forecast (force cache bypass)
      const forecast = await getForecast(latitude, longitude, true);
      if (!forecast) {
        console.warn(`[API/Cron/CheckAlerts] Skipped forecast for location ${locationName} (API offline)`);
        continue;
      }

      // Save forecast snapshot in DB for offline PWA sync
      await prisma.weatherSnapshot.create({
        data: {
          sessionId,
          latitude,
          longitude,
          locationName,
          data: JSON.stringify(forecast),
        }
      });

      // 4. Calculate Risk
      const assessment = calculateRisk(forecast, household);

      // Save Risk assessment in DB
      await prisma.riskAssessment.create({
        data: {
          sessionId,
          overall: assessment.overall,
          data: JSON.stringify(assessment)
        }
      });

      // 5. Check if overall risk is high or severe to trigger alerts
      if (assessment.overall === "high" || assessment.overall === "severe") {
        
        // Check if there is an active alert for this location already in the global alerts table
        // For simplicity, generate a localized alert log
        const alertTitle = `High Monsoon Risk: ${assessment.overall.toUpperCase()}`;
        const alertReason = assessment.reasons.join(". ");

        // Create alert entry in database
        const alert = await prisma.alert.create({
          data: {
            severity: assessment.overall,
            hazardType: "monsoon",
            location: locationName,
            latitude,
            longitude,
            startTime: new Date(assessment.validFrom),
            endTime: new Date(assessment.validUntil),
            reason: alertReason,
            recommendedActions: JSON.stringify(assessment.recommendedActions),
            dataSource: "Open-Meteo & Saathi Risk Engine",
            isOfficial: false,
          }
        });

        alertsGeneratedCount++;

        // Send push notifications if VAPID keys are configured and user has subscriptions
        if (pushConfigured && location.session.pushSubscriptions.length > 0) {
          const payload = JSON.stringify({
            title: `Monsoon Saathi Alert: ${locationName}`,
            body: `Risk level went to ${assessment.overall.toUpperCase()}. ${assessment.reasons[0] || ""}`,
            url: "/alerts",
            severity: assessment.overall
          });

          for (const sub of location.session.pushSubscriptions) {
            try {
              const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth
                }
              };
              
              await webpush.sendNotification(pushSubscription, payload);
              pushNotificationsSentCount++;
            } catch (err: any) {
              console.error(`[API/Cron/CheckAlerts] Failed to send push to subscription ${sub.id}:`, err.message);
              // Clean up stale subscription
              if (err.statusCode === 410 || err.statusCode === 404) {
                await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      checkedLocations: primaryLocations.length,
      alertsGenerated: alertsGeneratedCount,
      pushNotificationsSent: pushNotificationsSentCount,
      pushConfigured
    });
  } catch (error: any) {
    console.error("[API/Cron/CheckAlerts] Global error checking alerts:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error.message }, { status: 500 });
  }
}
