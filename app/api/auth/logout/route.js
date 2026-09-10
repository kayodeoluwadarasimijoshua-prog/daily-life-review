import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { clearSessionCookie, getSessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const token = getSessionToken();
    if (token) await destroySession(token);
    clearSessionCookie();
  } catch (err) {
    console.error("[logout]", err);
  }
  return NextResponse.json({ ok: true });
}
