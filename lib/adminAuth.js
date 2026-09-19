import crypto from "node:crypto";
import { getSetting, ADMIN_PW_KEY } from "./store";

export const ADMIN_COOKIE = "dlr-admin";
export const ADMIN_MAX_AGE = 60 * 60 * 12; // 12 hours

/** Signed cookie value — can't be forged without knowing the stored hash. */
export function signAdmin(hash) {
  return crypto.createHmac("sha256", hash).update("admin-ok").digest("hex");
}

export async function verifyAdminCookie(req) {
  const stored = await getSetting(ADMIN_PW_KEY);
  if (!stored) return false;
  const raw = req.cookies?.get?.(ADMIN_COOKIE)?.value;
  if (!raw) return false;
  const expected = signAdmin(stored);
  const a = Buffer.from(raw);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function adminCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  };
}
