import { isValidISODate, toISODate } from "./dates";
import { MOOD_BY_VALUE } from "./moods";

// Coerce/validate an incoming entry payload.
// Returns { ok:true, data } or { ok:false, error }.
export function parseEntryInput(body) {
  let date = String(body.date || "");
  const title = String(body.title || "").trim();
  const text = String(body.body || "").trim();
  let mood = body.mood == null ? null : String(body.mood).trim();

  if (!date) date = toISODate();
  if (!isValidISODate(date)) return { ok: false, error: "Please pick a valid date." };
  if (!title) return { ok: false, error: "Give your entry a short title." };

  if (mood === "") mood = null;
  if (mood && !MOOD_BY_VALUE[mood]) {
    return { ok: false, error: "That mood isn't recognised." };
  }

  return { ok: true, data: { date, title, body: text, mood: mood || null } };
}
