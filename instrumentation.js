// Runs once when the Node server starts (production & dev), so the demo
// user + seeded history exist before anyone logs in.
import { ensureSeeded } from "./lib/seed";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      ensureSeeded();
    } catch (err) {
      console.error("[seed] startup seeding failed:", err);
    }
  }
}
