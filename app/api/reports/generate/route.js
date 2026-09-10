import { NextResponse } from "next/server";
import { requireUser, withAuth } from "@/lib/api-guard";
import { listEntries, saveReport } from "@/lib/store";
import { generateWeeklyReport } from "@/lib/ai/index";
import { currentWeekStartISO, addDaysISO, isValidISODate } from "@/lib/dates";

export const dynamic = "force-dynamic";

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const POST = withAuth(async function POST(req) {
  const user = requireUser();
  const body = await req.json().catch(() => ({}));

  // Optional explicit Monday; default to the current week.
  let weekStart = String(body.weekStart || "");
  if (!weekStart) {
    weekStart = currentWeekStartISO();
  } else if (!isValidISODate(weekStart)) {
    return NextResponse.json({ error: "Invalid week start date." }, { status: 400 });
  }
  const weekEnd = addDaysISO(weekStart, 6);

  const all = listEntries(user.id);
  const weekEntries = all.filter((e) => e.date >= weekStart && e.date <= weekEnd);

  if (weekEntries.length === 0) {
    return NextResponse.json(
      { error: "No journal entries found for this week. Add a few notes first, then generate your review." },
      { status: 400 }
    );
  }

  // Keep the loading state visible long enough to feel like "AI thinking".
  await delay(1500);

  const payload = await generateWeeklyReport({ entries: weekEntries, weekStart, weekEnd });
  if (!payload) {
    return NextResponse.json({ error: "Couldn't build a review for this week." }, { status: 400 });
  }

  const report = saveReport(user.id, { weekStart, weekEnd, payload });
  return NextResponse.json({ report });
});
