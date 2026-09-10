import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { clearSessionCookie, getSessionToken } from "@/lib/session";

export async function POST() {
  try {
    const token = getSessionToken();
    if (token) destroySession(token);
    clearSessionCookie();
  } catch (err) {
    console.error("[logout]", err);
  }
  return NextResponse.json({ ok: true });
}
