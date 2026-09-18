// ---------------------------------------------------------------------------
// OpenRouter provider — calls a real LLM to produce the weekly review.
//
// OpenRouter exposes an OpenAI-compatible /chat/completions endpoint, so one
// key gives access to many models (including free ones).
//
// Env vars:
//   OPENROUTER_API_KEY   required — key from https://openrouter.ai/keys
//   OPENROUTER_MODEL     optional — defaults to a fast, cheap model
//   OPENROUTER_BASE_URL  optional — override the API base
//   NEXT_PUBLIC_SITE_URL optional — sent as HTTP-Referer for OpenRouter ranking
//
// The output is validated and repaired against the exact schema the local
// engine produces, so the report UI can never receive a malformed payload.
// Anything the model gets wrong is recomputed from the real entry data.
// ---------------------------------------------------------------------------

import { MOODS, MOOD_BY_VALUE, scoreForMood } from "../moods";
import { formatWeekRange, addDaysISO } from "../dates";

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_BASE = "https://openrouter.ai/api/v1";
const TIMEOUT_MS = 45_000;
const MAX_ENTRY_CHARS = 1200; // guard against one huge entry blowing the context

const VALID_MOODS = MOODS.map((m) => m.value);

export function isOpenRouterConfigured() {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

export function openRouterModel() {
  return process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

/* ------------------------------ helpers ------------------------------ */

const clampStr = (v, max = 600) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

function strArray(v, { max = 6, maxLen = 400 } = {}) {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean)
    .map((s) => s.slice(0, maxLen))
    .slice(0, max);
}

function objArray(v, mapFn, max = 6) {
  if (!Array.isArray(v)) return [];
  return v.map(mapFn).filter(Boolean).slice(0, max);
}

/**
 * Recompute mood facts from the REAL entries rather than trusting the model.
 * The LLM writes the prose; the numbers stay factual.
 */
function computeMoodTrend(entries, weekStart) {
  const byDate = new Map();
  for (const e of entries) {
    const list = byDate.get(e.date) || [];
    list.push(e);
    byDate.set(e.date, list);
  }

  const days = [];
  let sum = 0;
  let n = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDaysISO(weekStart, i);
    const list = byDate.get(date);
    if (!list || list.length === 0) continue;

    // average the moods recorded on that day
    let dSum = 0;
    for (const e of list) dSum += scoreForMood(e.mood);
    const dScore = dSum / list.length;

    // nearest canonical mood for the day
    const mood = MOODS.reduce((best, m) =>
      Math.abs(m.score - dScore) < Math.abs(best.score - dScore) ? m : best
    , MOODS[0]);

    days.push({
      date,
      mood: mood.value,
      moodLabel: mood.label,
      score: Math.round(dScore * 100) / 100,
    });
    sum += dScore;
    n++;
  }

  const average = n ? Math.round((sum / n) * 100) / 100 : 3;
  const dominant = MOODS.reduce((best, m) =>
    Math.abs(m.score - average) < Math.abs(best.score - average) ? m : best
  , MOODS[0]);

  // direction: compare first half vs second half of journaled days
  let direction = "stable";
  if (days.length >= 2) {
    const mid = Math.floor(days.length / 2);
    const firstAvg =
      days.slice(0, mid).reduce((a, d) => a + d.score, 0) / Math.max(mid, 1);
    const rest = days.slice(mid);
    const lastAvg = rest.reduce((a, d) => a + d.score, 0) / Math.max(rest.length, 1);
    const delta = lastAvg - firstAvg;
    if (delta > 0.4) direction = "improving";
    else if (delta < -0.4) direction = "declining";
  }

  return {
    average,
    dominantValue: dominant.value,
    dominant: dominant.label,
    direction,
    days,
    journaledDays: days.length,
  };
}

/**
 * Validate + repair the model's JSON into the canonical report schema.
 * Returns null if the payload is too broken to be useful (caller falls back).
 */
function coerceReport(raw, { entries, weekStart, weekEnd, model }) {
  if (!raw || typeof raw !== "object") return null;

  const summary = clampStr(raw.summary, 1200);
  // A report with no usable summary isn't worth showing.
  if (summary.length < 40) return null;

  const validDates = new Set(entries.map((e) => e.date));
  const pickDate = (d) =>
    typeof d === "string" && validDates.has(d) ? d : entries[0].date;

  const themes = objArray(
    raw.themes,
    (t) => {
      if (!t || typeof t !== "object") return null;
      const name = clampStr(t.name, 60);
      if (!name) return null;
      return {
        name,
        count: Number.isFinite(t.count) ? Math.max(1, Math.trunc(t.count)) : 1,
        distinctDays: Number.isFinite(t.distinctDays)
          ? Math.max(1, Math.trunc(t.distinctDays))
          : 1,
        example: clampStr(t.example, 300),
      };
    },
    6
  );

  const evt = (x) => {
    if (!x || typeof x !== "object") return null;
    const text = clampStr(x.text, 400);
    const title = clampStr(x.title, 140);
    if (!text && !title) return null;
    return { date: pickDate(x.date), title: title || "Note", text };
  };

  const wins = objArray(raw.wins, evt, 5);
  const challenges = objArray(raw.challenges, evt, 5);
  const patterns = strArray(raw.patterns, { max: 5 });
  const suggestions = strArray(raw.suggestions, { max: 5 });

  // Numbers are always recomputed from real data — never trusted to the LLM.
  const moodTrend = computeMoodTrend(entries, weekStart);

  return {
    meta: {
      engine: "openrouter",
      model,
      generatedAt: new Date().toISOString(),
      weekStart,
      weekEnd,
    },
    summary,
    moodTrend,
    themes,
    wins,
    challenges,
    patterns,
    suggestions,
    stats: {
      totalEntries: entries.length,
      journaledDays: moodTrend.journaledDays,
      weekLabel: formatWeekRange(weekStart),
    },
  };
}

/** Pull a JSON object out of a response that may be wrapped in prose/fences. */
function parseLooseJSON(content) {
  if (typeof content !== "string") return null;
  let s = content.trim();

  // strip ``` / ```json fences
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) s = fence[1].trim();

  try {
    return JSON.parse(s);
  } catch {
    // last resort: slice from first { to last }
    const a = s.indexOf("{");
    const b = s.lastIndexOf("}");
    if (a !== -1 && b > a) {
      try {
        return JSON.parse(s.slice(a, b + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/* ------------------------------- prompt ------------------------------- */

const SYSTEM_PROMPT = `You are a warm, perceptive journaling companion writing a weekly life review.

You will receive a person's journal entries for one week. Write a reflective review
that helps them see patterns they might have missed. Be specific — quote and reference
their ACTUAL experiences, never generic filler advice.

Return ONLY a JSON object with exactly this shape:

{
  "summary": "3-5 warm sentences addressed to the person as 'you'. Reference concrete things that actually happened this week.",
  "themes": [{"name": "Short Theme Name", "count": 3, "distinctDays": 2, "example": "a short quote or paraphrase from their entries"}],
  "wins": [{"date": "YYYY-MM-DD", "title": "short title", "text": "why this mattered"}],
  "challenges": [{"date": "YYYY-MM-DD", "title": "short title", "text": "what felt hard, described with compassion"}],
  "patterns": ["An observation connecting events across days, e.g. how one thing affected another."],
  "suggestions": ["One concrete, kind, actionable suggestion grounded in what they actually wrote."]
}

Rules:
- 2-4 themes, up to 3 wins, up to 3 challenges, 2-3 patterns, 2-3 suggestions.
- Every "date" MUST be copied exactly from a date present in the entries.
- Never invent events that are not in the entries.
- Warm and human, never clinical or preachy. Do not diagnose.
- If the week was hard, acknowledge it honestly before suggesting anything.
- Output raw JSON only — no markdown fences, no commentary.`;

function buildUserMessage({ entries, weekStart, weekEnd }) {
  const lines = entries.map((e) => {
    const mood = e.mood && MOOD_BY_VALUE[e.mood] ? MOOD_BY_VALUE[e.mood].label : "not set";
    const body = String(e.body || "").slice(0, MAX_ENTRY_CHARS);
    return `[${e.date}] (mood: ${mood})\nTitle: ${e.title || "Untitled"}\n${body}`;
  });

  return `My journal entries for the week of ${weekStart} to ${weekEnd}:

${lines.join("\n\n---\n\n")}

Valid dates you may reference: ${[...new Set(entries.map((e) => e.date))].join(", ")}

Write my weekly review as JSON.`;
}

/* ------------------------------- main -------------------------------- */

export async function generateWithOpenRouter({ entries, weekStart, weekEnd }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  if (!entries || entries.length === 0) return null;

  const model = openRouterModel();
  const base = process.env.OPENROUTER_BASE_URL || DEFAULT_BASE;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://daily-life-review.vercel.app";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        // Optional OpenRouter attribution headers
        "HTTP-Referer": site,
        "X-Title": "Daily Life Review",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 1600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserMessage({ entries, weekStart, weekEnd }) },
        ],
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("OpenRouter request timed out");
    throw new Error(`OpenRouter request failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Surface the common, actionable failures clearly in the server log.
    if (res.status === 401) throw new Error("OpenRouter rejected the API key (401)");
    if (res.status === 402) throw new Error("OpenRouter credits exhausted (402)");
    if (res.status === 429) throw new Error("OpenRouter rate limit hit (429)");
    throw new Error(`OpenRouter error ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty completion");

  const parsed = parseLooseJSON(content);
  if (!parsed) throw new Error("Could not parse JSON from the model response");

  const report = coerceReport(parsed, { entries, weekStart, weekEnd, model });
  if (!report) throw new Error("Model response did not contain a usable review");

  return report;
}
