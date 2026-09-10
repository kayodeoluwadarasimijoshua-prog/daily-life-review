import { NextResponse } from "next/server";
import { verifyPassword, createSession } from "@/lib/auth";
import { setSessionCookie, publicUser } from "@/lib/session";
import { ensureSeeded } from "@/lib/seed";
import { findUserByEmail, ensureSchema } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    await ensureSchema();
    // Make sure the seeded demo account exists before any login attempt.
    await ensureSeeded();

    const body = await req.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const row = await findUserByEmail(email);
    if (!row || !verifyPassword(password, row.password_hash)) {
      // deliberate: don't reveal whether the email exists
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    const token = await createSession(row.id);
    setSessionCookie(token);

    const user = { id: row.id, name: row.name, email: row.email, createdAt: row.created_at };
    return NextResponse.json({ user: publicUser(user) });
  } catch (err) {
    console.error("[login]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
