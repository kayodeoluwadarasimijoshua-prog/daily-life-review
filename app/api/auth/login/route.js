import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { verifyPassword } from "@/lib/auth";
import { findUserByEmail, findOrCreateUserBySupabase } from "@/lib/store";
import { publicUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      // ── Supabase auth ──
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // If Supabase doesn't have the user, fall through to local check below
        // (supports the demo account which may only exist in Turso)
        const localUser = await findUserByEmail(email);
        if (!localUser || !localUser.password_hash || !verifyPassword(password, localUser.password_hash)) {
          return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
        }
        // Demo / legacy password user — return user without Supabase session
        return NextResponse.json({ user: publicUser(localUser) });
      }

      // Supabase login succeeded — sync user to Turso
      const supaUser = data.user;
      const appUser = await findOrCreateUserBySupabase({
        id: supaUser.id,
        email: supaUser.email,
        name: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || supaUser.email?.split("@")[0],
      });
      return NextResponse.json({ user: publicUser(appUser) });
    }

    // ── Legacy local auth (no Supabase configured) ──
    const { ensureSeeded } = await import("@/lib/seed");
    await ensureSeeded();

    const row = await findUserByEmail(email);
    if (!row || !row.password_hash || !verifyPassword(password, row.password_hash)) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const { createSession, COOKIE_NAME } = await import("@/lib/auth");
    const { cookies } = await import("next/headers");
    const token = await createSession(row.id);
    cookies().set(COOKIE_NAME, token, {
      httpOnly: true, sameSite: "lax", path: "/",
      secure: false, maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ user: publicUser(row) });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
