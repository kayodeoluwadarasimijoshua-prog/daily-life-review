import { NextResponse } from "next/server";
import { hashPassword, createSession } from "@/lib/auth";
import { setSessionCookie, publicUser } from "@/lib/session";
import { ensureSeeded } from "@/lib/seed";
import { findUserByEmail, createUser, ensureSchema } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await ensureSchema();
    await ensureSeeded();
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
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const taken = await findUserByEmail(email);
    if (taken) {
      return NextResponse.json(
        { error: "An account with that email already exists. Try logging in." },
        { status: 409 }
      );
    }

    const user = await createUser({ name, email, passwordHash: hashPassword(password) });
    const token = await createSession(user.id);
    setSessionCookie(token);

    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
