import { NextResponse } from "next/server";
import { requireUser, withAuth } from "@/lib/api-guard";
import { listEntries, saveReport } from "@/lib/store";
import { generateWeeklyReport } from "@/lib/ai/index";
import { currentWeekStartISO, addDaysISO, isValidISODate } from "@/lib/dates";

export const dynamic = "force-dynamic";
// LLM generation needs more than the 10s default on Vercel's Node runtime.
export const maxDuration = 100;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export const POST = withAuth(async function POST(req) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));

  // Optional explicit Monday; default to the current week.
  let weekStart = String(body.weekStart || "");
  if (!weekStart) {
    weekStart = currentWeekStartISO();
  } else if (!isValidISODate(weekStart)) {
    return NextResponse.json({ error: "Invalid week start date." }, { status: 400 });
  }
  const weekEnd = addDaysISO(weekStart, 6);

  const all = await listEntries(user.id);
  const weekEntries = all.filter((e) => e.date >= weekStart && e.date <= weekEnd);

  if (weekEntries.length === 0) {
    return NextResponse.json(
      {
        error:
          "No journal entries found for this week. Add a few notes first, then generate your review.",
      },
      { status: 400 }
    );
  }

  // A real LLM call already takes several seconds; only pad the loading
  // state when the fast offline engine is doing the work.
  const started = Date.now();
  const payload = await generateWeeklyReport({ entries: weekEntries, weekStart, weekEnd });
  const elapsed = Date.now() - started;
  if (elapsed < 1200) await delay(1200 - elapsed);
  if (!payload) {
    return NextResponse.json({ error: "Couldn't build a review for this week." }, { status: 400 });
  }

  const report = await saveReport(user.id, { weekStart, weekEnd, payload });
  return NextResponse.json({ report });
});
