import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Exchanges the admin token for an httpOnly cookie so the dashboard can
 * keep fetching without the token living in localStorage or the URL.
 */
export async function POST(req) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return NextResponse.json({ error: "Admin is not configured." }, { status: 503 });
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body.token || "");

  if (token !== expected) {
    return NextResponse.json({ error: "Incorrect admin token." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("dlr_admin", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 12, // 12 hours
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("dlr_admin", "", { path: "/", maxAge: 0 });
  return res;
}
