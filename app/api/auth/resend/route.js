import { NextResponse } from "next/server";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Re-sends the Supabase signup confirmation email.
export async function POST(req) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ ok: true });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const supabase = createClient();
    const { error } = await supabase.auth.resend({ type: "signup", email });

    if (error) {
      const low = String(error.message || "").toLowerCase();
      if (low.includes("rate limit") || low.includes("too many")) {
        return NextResponse.json(
          { error: "We just sent one — please wait a minute before requesting another." },
          { status: 429 }
        );
      }
      // Don't reveal whether an address is registered.
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[resend]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
