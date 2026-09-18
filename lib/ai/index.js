// ------------------------------------------------------------------------
// AI Provider interface.
//
// generateWeeklyReport() decides which engine produces the weekly review:
//   1. A real LLM provider, if one is configured via env vars.
//   2. Otherwise the built-in local lexical engine (lib/ai/analysis.js),
//      so the app always works with zero configuration.
//
// The LLM path is ALWAYS wrapped in a try/catch that falls back to the
// local engine — a bad key, no credits, a timeout or a malformed response
// can never stop a user from getting their weekly review.
// ------------------------------------------------------------------------

import { analyzeWeek } from "./analysis";

// Explicit override, else auto-detect from whichever key is present.
const EXPLICIT = process.env.AI_PROVIDER; // "openrouter" | "openai" | "local"

function detectProvider() {
  if (EXPLICIT) return EXPLICIT.toLowerCase();
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "local";
}

const PROVIDER = detectProvider();

export const activeProvider = PROVIDER;

export const providerStatus = (() => {
  if (PROVIDER === "openrouter") {
    if (!process.env.OPENROUTER_API_KEY) {
      return "OpenRouter selected but OPENROUTER_API_KEY is missing — using local engine";
    }
    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    return `OpenRouter · ${model}`;
  }
  if (PROVIDER === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      return "OpenAI selected but OPENAI_API_KEY is missing — using local engine";
    }
    return `OpenAI · ${process.env.OPENAI_MODEL || "gpt-4o-mini"}`;
  }
  return "Local analysis engine (offline, no API key required)";
})();

/**
 * @param {object} opts
 * @param {object[]} opts.entries  journal entries within the week
 * @param {string} opts.weekStart  ISO Monday
 * @param {string} opts.weekEnd    ISO Sunday
 * @returns {Promise<object|null>} structured report payload (null if no data)
 */
export async function generateWeeklyReport({ entries, weekStart, weekEnd }) {
  if (PROVIDER === "openrouter" && process.env.OPENROUTER_API_KEY) {
    try {
      const { generateWithOpenRouter } = await import("./openrouter-provider");
      const out = await generateWithOpenRouter({ entries, weekStart, weekEnd });
      if (out) return out;
      console.warn("[ai] OpenRouter returned no report — falling back to local engine");
    } catch (err) {
      console.error(
        "[ai] OpenRouter failed, falling back to local engine:",
        err?.message || err
      );
    }
  }

  if (PROVIDER === "openai" && process.env.OPENAI_API_KEY) {
    try {
      const { generateWithOpenAI } = await import("./openai-provider");
      const out = await generateWithOpenAI({ entries, weekStart, weekEnd });
      if (out) return out;
    } catch (err) {
      console.error(
        "[ai] OpenAI failed, falling back to local engine:",
        err?.message || err
      );
    }
  }

  return analyzeWeek(entries, { weekStart, weekEnd });
}
