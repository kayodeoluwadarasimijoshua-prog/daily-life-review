import { NextResponse } from "next/server";
import { requireUser, withAuth } from "@/lib/api-guard";
import { getReminder, saveReminder } from "@/lib/store";

export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const GET = withAuth(async function GET() {
  const user = await requireUser();
  const reminder = await getReminder(user.id);
  return NextResponse.json({
    reminder,
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
  });
});

export const PUT = withAuth(async function PUT(req) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));

  if (body.time !== undefined && !TIME_RE.test(String(body.time))) {
    return NextResponse.json({ error: "Please choose a valid time." }, { status: 400 });
  }

  const reminder = await saveReminder(user.id, {
    enabled: body.enabled,
    pushEnabled: body.pushEnabled,
    time: body.time,
    tzOffset: body.tzOffset,
  });

  return NextResponse.json({ reminder });
});
