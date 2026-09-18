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

const DEFAULT_MODEL = "z-ai/glm-5.2:free";
const DEFAULT_BASE = "https://openrouter.ai/api/v1";

// Free-tier keys are rate limited per model, so if the primary model is busy
// (429) or unavailable (403/404) we transparently retry the next one.
// Verified working against the live OpenRouter catalogue.
const FALLBACK_MODELS = [
  "z-ai/glm-5.2:free",                      // fastest (~6-12s), frequently 429s
  "deepseek/deepseek-v4-flash-0731:free",   // slower (~13-35s), more available
  "nvidia/nemotron-3-ultra-550b-a55b:free", // last resort, high quality but slow
];

// Errors worth retrying on a different model rather than giving up.
const RETRYABLE = new Set([403, 404, 429, 502, 503]);
// Per-model timeout. Kept well under the serverless function limit so that
// a slow model fails fast and the next one still has time to answer.
// Free-tier models are slow and variable (typically 13-35s). Allow a real
// chance to answer, but give up early enough that two attempts plus the
// offline fallback still finish inside the function's maxDuration.
const TIMEOUT_MS = 35_000;
// Hard ceiling across ALL attempts — guarantees we return before the
// platform kills the function, falling back to the local engine if needed.
const TOTAL_BUDGET_MS = 75_000;
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
    .map((s) => {
      if (typeof s === "string") return s.trim();
      // Some models wrap each item in an object — pull the obvious field out.
      if (s && typeof s === "object") {
        const c = s.text ?? s.pattern ?? s.suggestion ?? s.description ?? s.title;
        return typeof c === "string" ? c.trim() : "";
      }
      return "";
    })
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
      // Tolerate a bare theme name instead of the full object.
      if (typeof t === "string") {
        const n = t.trim().slice(0, 60);
        return n ? { name: n, count: 1, distinctDays: 1, example: "" } : null;
      }
      if (!t || typeof t !== "object") return null;
      const name = clampStr(t.name ?? t.theme ?? t.title, 60);
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
    // Some models return a bare string instead of the {date,title,text}
    // object. Accept that shape rather than dropping the content.
    if (typeof x === "string") {
      const s = x.trim();
      if (!s) return null;
      return {
        date: entries[0].date,
        title: s.length > 60 ? s.slice(0, 57).trimEnd() + "…" : s,
        text: s.length > 60 ? s.slice(0, 400) : "",
      };
    }
    if (!x || typeof x !== "object") return null;
    const text = clampStr(x.text ?? x.description ?? x.detail, 400);
    const title = clampStr(x.title ?? x.name ?? x.summary, 140);
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

Return ONLY this JSON (no markdown fences, no commentary):

{
  "summary": "3-4 warm sentences to the person as 'you', citing what actually happened",
  "themes": [{"name": "Theme", "count": 2, "distinctDays": 2, "example": "short quote"}],
  "wins": [{"date": "YYYY-MM-DD", "title": "short", "text": "why it mattered"}],
  "challenges": [{"date": "YYYY-MM-DD", "title": "short", "text": "what was hard"}],
  "patterns": ["how one thing affected another across days"],
  "suggestions": ["one kind, concrete suggestion from what they wrote"]
}

Rules: 2-3 themes, max 3 wins, max 3 challenges, 2-3 patterns, 2-3 suggestions.
Copy every "date" exactly from the entries. Invent nothing. Be warm, never
clinical or preachy, and never diagnose. Answer immediately without deliberating.`;

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

/** One attempt against a single model. Throws with `.status` on HTTP errors. */
async function callModel({ model, apiKey, base, site, userMessage, budgetMs }) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Math.max(5_000, Math.min(TIMEOUT_MS, budgetMs ?? TIMEOUT_MS))
  );

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
        // Generous ceiling: several free models are reasoning models whose
        // internal thinking tokens count toward this budget. Too low and the
        // JSON gets truncated mid-object.
        max_tokens: 3000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new Error(`${model} timed out`);
    throw new Error(`OpenRouter request failed: ${err.message}`);
  }
  // NOTE: the timer is deliberately NOT cleared here. fetch() resolves as
  // soon as response *headers* arrive, but a slow model can stream the body
  // for much longer. Keeping the abort armed until the body is fully read is
  // what actually bounds the call.

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    clearTimeout(timer);
    // Surface the common, actionable failures clearly in the server log.
    let msg;
    if (res.status === 401) msg = "OpenRouter rejected the API key (401)";
    else if (res.status === 402) msg = "OpenRouter credits exhausted (402)";
    else if (res.status === 429) msg = `Rate limited on ${model} (429)`;
    else msg = `OpenRouter error ${res.status}: ${body.slice(0, 160)}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  let json;
  try {
    json = await res.json();
  } catch (err) {
    if (err.name === "AbortError") throw new Error(`${model} timed out while responding`);
    throw new Error(`Malformed response from ${model}`);
  } finally {
    clearTimeout(timer);
  }

  // OpenRouter can return 200 with an error body when a provider fails.
  if (json?.error && !json?.choices?.length) {
    const err = new Error(`Provider error: ${String(json.error?.message || json.error).slice(0, 160)}`);
    err.status = json.error?.code;
    throw err;
  }

  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty completion");
  return content;
}

export async function generateWithOpenRouter({ entries, weekStart, weekEnd }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
  if (!entries || entries.length === 0) return null;

  const base = process.env.OPENROUTER_BASE_URL || DEFAULT_BASE;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://daily-life-review.vercel.app";
  const userMessage = buildUserMessage({ entries, weekStart, weekEnd });

  // Try the configured model first, then the remaining free fallbacks.
  const preferred = openRouterModel();
  const chain = [preferred, ...FALLBACK_MODELS.filter((m) => m !== preferred)];

  const deadline = Date.now() + TOTAL_BUDGET_MS;

  let lastErr;
  for (const model of chain) {
    // Stop trying if there isn't enough time left for a realistic attempt.
    if (Date.now() > deadline) {
      console.warn("[ai] time budget exhausted — falling back to local engine");
      break;
    }
    try {
      const content = await callModel({
        model, apiKey, base, site, userMessage,
        budgetMs: deadline - Date.now(),
      });
      const parsed = parseLooseJSON(content);
      if (!parsed) throw new Error("Could not parse JSON from the model response");

      const report = coerceReport(parsed, { entries, weekStart, weekEnd, model });
      if (!report) throw new Error("Model response did not contain a usable review");

      if (model !== preferred) {
        console.warn(`[ai] primary model unavailable — review generated with ${model}`);
      }
      return report;
    } catch (err) {
      lastErr = err;

      // A bad key or exhausted credits will fail identically on every model.
      if (err.status === 401 || err.status === 402) throw err;

      // Retry the next model on transient/availability errors, or when this
      // particular model produced unusable output.
      const retryable = RETRYABLE.has(err.status) || err.status === undefined;
      if (!retryable) throw err;

      console.warn(`[ai] ${model} failed (${err.message}) — trying next model`);
    }
  }

  throw lastErr || new Error("All OpenRouter models failed");
}
