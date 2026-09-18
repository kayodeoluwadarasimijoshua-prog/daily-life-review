// Client-side fetch helpers and misc formatting.
"use client";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    // Full response body, so callers can read extra fields such as
    // `needsConfirmation` rather than string-matching the message.
    this.data = data || null;
  }
}

// Throws ApiError(message) on non-2xx.
export async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    const msg = (data && data.error) || "Something went wrong. Please try again.";
    const err = new ApiError(msg, res.status, data);
    if (res.status === 401 && typeof window !== "undefined") {
      const url = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = url;
      }
    }
    throw err;
  }
  return data || {};
}

// Time-of-day greeting based on the *viewer's* local clock.
// Pass an hour to override (used by tests / hydration-safe rendering).
export function greeting(hour) {
  const h = typeof hour === "number" ? hour : new Date().getHours();
  if (h < 5) return "Good night";        // 12am – 4:59am
  if (h < 12) return "Good morning";     // 5am  – 11:59am
  if (h < 17) return "Good afternoon";   // 12pm – 4:59pm
  if (h < 21) return "Good evening";     // 5pm  – 8:59pm
  return "Good night";                   // 9pm  – 11:59pm
}

// A short sub-phrase that matches the time of day.
export function timeOfDay(hour) {
  const h = typeof hour === "number" ? hour : new Date().getHours();
  if (h < 5) return "night";
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  if (h < 21) return "evening";
  return "night";
}

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function prettyDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${MONTHS_SHORT[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
