import { NextResponse } from "next/server";
import { verifyAdminCookie } from "./adminAuth";

/**
 * Shared auth for the /admin endpoints.
 *
 * Access is granted solely by the signed admin-password cookie set at /admin
 * (see lib/adminAuth.js). There is no ADMIN_TOKEN fallback.
 *
 * Returns null when authorised, or a NextResponse to return immediately.
 */
export async function checkAdmin(req) {
  if (await verifyAdminCookie(req)) return null;
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
