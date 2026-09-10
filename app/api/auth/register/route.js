import { NextResponse } from "next/server";
import db from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { setSessionCookie, publicUser } from "@/lib/session";
import { ensureSeeded } from "@/lib/seed";

export async function POST(req) {
  try {
    ensureSeeded();
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

    const taken = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (taken) {
      return NextResponse.json(
        { error: "An account with that email already exists. Try logging in." },
        { status: 409 }
      );
    }

    const info = db
      .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
      .run(name, email, hashPassword(password));

    const token = createSession(info.lastInsertRowid);
    setSessionCookie(token);

    const user = db
      .prepare("SELECT id, name, email, created_at AS createdAt FROM users WHERE id = ?")
      .get(info.lastInsertRowid);

    return NextResponse.json({ user: publicUser(user) }, { status: 201 });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
