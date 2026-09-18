import { NextResponse } from "next/server";
import {
  listActiveReminders,
  listPushSubs,
  deletePushSub,
  markReminderSent,
  listEntries,
} from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends the daily nudge to everyone whose chosen local time has already
 * passed today and who hasn't journaled yet.
 *
 * Invoked by Vercel Cron. NOTE: the Hobby (free) plan permits only ONE cron
 * run per day, so this fires once at 19:00 UTC rather than hourly. Users
 * whose chosen time falls before that get the push at the cron time instead
 * of exactly their chosen minute; the in-app nudge is always precise.
 *
 * Protected by CRON_SECRET, which Vercel sends as `Authorization: Bearer …`.
 */
async function handler(req) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }

  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@dailyreview.app",
    vapidPublic,
    vapidPrivate
  );

  const users = await listActiveReminders();
  const now = new Date();
  let sent = 0;
  let skipped = 0;

  for (const u of users) {
    if (!u.pushEnabled) { skipped++; continue; }

    // Convert "now" into this user's local wall-clock time.
    // getTimezoneOffset() is minutes BEHIND UTC, hence the subtraction.
    const localMs = now.getTime() - u.tzOffset * 60_000;
    const local = new Date(localMs);
    const localDate = local.toISOString().slice(0, 10);
    const localHour = local.getUTCHours();
    const localMin = local.getUTCMinutes();

    const [targetH, targetM] = u.time.split(":").map(Number);

    // Fire once the target time has passed today (cron runs hourly, so allow
    // the whole hour), and never twice on the same local day.
    const pastTarget =
      localHour > targetH || (localHour === targetH && localMin >= targetM);
    if (!pastTarget) { skipped++; continue; }
    if (u.lastSentOn === localDate) { skipped++; continue; }

    // Don't nag someone who already journaled today.
    const entries = await listEntries(u.userId);
    if (entries.some((e) => e.date === localDate)) {
      await markReminderSent(u.userId, localDate);
      skipped++;
      continue;
    }

    const subs = await listPushSubs(u.userId);
    if (subs.length === 0) { skipped++; continue; }

    const firstName = String(u.name || "").split(" ")[0] || "there";
    const payload = JSON.stringify({
      title: "How was your day?",
      body: `${firstName}, take a minute to capture today before it slips away.`,
      url: "/journal?new=1",
      tag: "daily-reminder",
    });

    let delivered = false;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
        delivered = true;
      } catch (err) {
        // 404/410 mean the subscription is dead — clean it up.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await deletePushSub(sub.endpoint);
        } else {
          console.error("[reminders] push failed:", err?.statusCode, err?.message);
        }
      }
    }

    if (delivered) {
      await markReminderSent(u.userId, localDate);
      sent++;
    }
  }

  return NextResponse.json({ ok: true, considered: users.length, sent, skipped });
}

export const GET = handler;
export const POST = handler;
