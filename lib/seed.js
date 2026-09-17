import { ensureSchema } from "./store";

let done = false;

/**
 * Ensures the database schema exists.
 * Runs once per server lifecycle.
 */
export async function ensureSeeded() {
  if (done) return;
  try {
    await ensureSchema();
    done = true;
  } catch (err) {
    console.error("[seed] schema init failed:", err);
    done = false; // retry next request
  }
}
