import { NextResponse } from "next/server";
import { listFeedback } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Read all submitted feedback.
 *
 * Guarded by ADMIN_TOKEN rather than the normal session, so it works from
 * curl without a browser:
 *   curl -H "Authorization: Bearer $ADMIN_TOKEN" .../api/feedback/list
 *
 * If ADMIN_TOKEN isn't set the endpoint stays closed.
 */
export async function GET(req) {
  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }

  const auth = req.headers.get("authorization") || "";
  const url = new URL(req.url);
  const qp = url.searchParams.get("token");

  if (auth !== `Bearer ${token}` && qp !== token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await listFeedback({ limit: 300 });
  return NextResponse.json({ count: items.length, items });
}
