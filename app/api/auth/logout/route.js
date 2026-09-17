import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      await supabase.auth.signOut();
    } else {
      // Legacy: clear local session
      const { destroySession, COOKIE_NAME } = await import("@/lib/auth");
      const { cookies } = await import("next/headers");
      const token = cookies().get(COOKIE_NAME)?.value;
      if (token) await destroySession(token);
      cookies().set(COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    }
  } catch (err) {
    console.error("[logout]", err);
  }
  return NextResponse.json({ ok: true });
}
