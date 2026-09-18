import { NextResponse } from "next/server";

/**
 * Shared auth for the /admin endpoints.
 *
 * Accepts the token from (in order):
 *   - Authorization: Bearer <token>
 *   - ?token=<token>
 *   - the `dlr_admin` cookie (set by the admin page after a successful unlock)
 *
 * Returns null when authorised, or a NextResponse to return immediately.
 */
export function checkAdmin(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Admin is not configured." }, { status: 503 });
  }

  const auth = req.headers.get("authorization") || "";
  if (auth === `Bearer ${token}`) return null;

  try {
    const qp = new URL(req.url).searchParams.get("token");
    if (qp && qp === token) return null;
  } catch {}

  const cookie = req.cookies?.get?.("dlr_admin")?.value;
  if (cookie && cookie === token) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
