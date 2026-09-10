// ------------------------------------------------------------------------
// AI Provider interface.
//
// generateWeeklyReport() decides which provider to use:
//   - If a real provider is configured via env vars it is used.
//   - Otherwise it falls back to the built-in local lexical engine
//     (lib/ai/analysis.js) so the app works with zero configuration.
//
// To wire in a real LLM later, add a provider module with the same
// signature and register it below — no other code needs to change.
// ------------------------------------------------------------------------

import { analyzeWeek } from "./analysis";

const PROVIDER = process.env.AI_PROVIDER; // e.g. "openai"

export const activeProvider = PROVIDER || "local";
export const providerStatus = (() => {
  if (PROVIDER) return `Connected via env provider "${PROVIDER}"`;
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
  // Only import external provider code when actually needed.
  if (PROVIDER === "openai") {
    const { generateWithOpenAI } = await import("./openai-provider");
    try {
      const out = await generateWithOpenAI({ entries, weekStart, weekEnd });
      if (out) return out;
    } catch (err) {
      console.error("[ai] OpenAI provider failed, falling back to local engine:", err.message);
    }
  }

  return analyzeWeek(entries, { weekStart, weekEnd });
}
