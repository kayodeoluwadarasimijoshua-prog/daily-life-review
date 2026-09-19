import { NextResponse } from "next/server";
import { listFeedback } from "@/lib/store";
import { verifyAdminCookie } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * Read all submitted feedback.
 *
 * Access is granted solely by the admin password cookie set at /admin.
 * There is no token/bearer fallback.
 */
export async function GET(req) {
  if (!(await verifyAdminCookie(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await listFeedback({ limit: 300 });
  return NextResponse.json({ count: items.length, items });
}
