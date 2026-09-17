import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { findOrCreateUserBySupabase, findUserByEmail } from "@/lib/store";
import { publicUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      // ── Supabase signup ──
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });

      if (error) {
        const msg = error.message.includes("already")
          ? "An account with that email already exists. Try logging in."
          : error.message;
        return NextResponse.json({ error: msg }, { status: 409 });
      }

      const supaUser = data.user;
      if (!supaUser) {
        return NextResponse.json({ error: "Could not create account. Please try again." }, { status: 500 });
      }

      // Sync to Turso
      const appUser = await findOrCreateUserBySupabase({
        id: supaUser.id,
        email: supaUser.email,
        name,
      });
      return NextResponse.json({ user: publicUser(appUser) }, { status: 201 });
    }

    // ── Legacy local signup (no Supabase) ──
    const { hashPassword, createSession, COOKIE_NAME } = await import("@/lib/auth");
    const { createUser } = await import("@/lib/store");
    const { cookies } = await import("next/headers");

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists. Try logging in." }, { status: 409 });
    }

    const user = await createUser({ name, email, passwordHash: hashPassword(password) });
    const token = await createSession(user.id);
    cookies().set(COOKIE_NAME, token, {
      httpOnly: true, sameSite: "lax", path: "/",
      secure: false, maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
