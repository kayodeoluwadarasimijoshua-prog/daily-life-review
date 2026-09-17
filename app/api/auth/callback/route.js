import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateUserBySupabase } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  // Always redirect to production URL
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;

  if (code) {
    const supabase = createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Sync Supabase user → Turso
      try {
        await findOrCreateUserBySupabase({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email?.split("@")[0],
        });
      } catch (err) {
        console.error("[callback] user sync failed:", err);
      }
    }
  }

  // Redirect to the app — user is now authenticated via Supabase cookies
  return NextResponse.redirect(`${siteUrl}/`);
}
