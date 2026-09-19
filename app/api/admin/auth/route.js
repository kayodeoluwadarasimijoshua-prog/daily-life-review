import { NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { getSetting, setSetting, ADMIN_PW_KEY } from "@/lib/store";
import {
  ADMIN_COOKIE,
  signAdmin,
  verifyAdminCookie,
  adminCookieOptions,
} from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/** GET: is a password configured, and am I already unlocked? */
export async function GET(req) {
  const configured = Boolean(await getSetting(ADMIN_PW_KEY));
  const unlocked = configured ? await verifyAdminCookie(req) : false;
  return NextResponse.json({ configured, unlocked });
}

/**
 * POST: first-time setup (no password yet) or login.
 * Body: { password, confirm? }
 */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const password = String(body?.password || "");
  const stored = await getSetting(ADMIN_PW_KEY);

  // ---- first-time setup ----
  if (!stored) {
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Choose a password of at least 8 characters." },
        { status: 400 }
      );
    }
    if (body?.confirm !== undefined && body.confirm !== password) {
      return NextResponse.json({ error: "Passwords don't match." }, { status: 400 });
    }
    const hash = hashPassword(password);
    await setSetting(ADMIN_PW_KEY, hash);
    const res = NextResponse.json({ ok: true, created: true });
    res.cookies.set(ADMIN_COOKIE, signAdmin(hash), adminCookieOptions());
    return res;
  }

  // ---- normal login ----
  await new Promise((r) => setTimeout(r, 250)); // blunt brute-force

  if (!password || !verifyPassword(password, stored)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, signAdmin(stored), adminCookieOptions());
  return res;
}

/** DELETE: lock again. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
