import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateUserBySupabase } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Handles every Supabase redirect back into the app:
 *   - OAuth / PKCE sign-in      -> ?code=...
 *   - Email confirmation links  -> ?token_hash=...&type=signup
 *   - Provider or link errors   -> ?error=...&error_description=...
 */
export async function GET(req) {
  const { searchParams, origin } = new URL(req.url);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  // Supabase reports failures (expired/already-used links) on the query string.
  const errParam = searchParams.get("error_description") || searchParams.get("error");
  if (errParam) {
    const msg = encodeURIComponent(String(errParam).slice(0, 200));
    return NextResponse.redirect(`${siteUrl}/login?error=${msg}`);
  }

  const supabase = createClient();
  let authedUser = null;
  let failure = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) failure = error.message;
    else authedUser = data?.user || null;
  } else if (tokenHash && type) {
    // Email confirmation / magic-link / recovery style links.
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) failure = error.message;
    else authedUser = data?.user || null;
  }

  if (failure) {
    const msg = encodeURIComponent(
      "That link is invalid or has expired. Please sign in or request a new one."
    );
    console.error("[callback]", failure);
    return NextResponse.redirect(`${siteUrl}/login?error=${msg}`);
  }

  if (authedUser) {
    try {
      await findOrCreateUserBySupabase({
        id: authedUser.id,
        email: authedUser.email,
        name:
          authedUser.user_metadata?.full_name ||
          authedUser.user_metadata?.name ||
          authedUser.email?.split("@")[0],
      });
    } catch (err) {
      console.error("[callback] user sync failed:", err);
    }
  }

  const dest = next && next.startsWith("/") ? next : "/";
  return NextResponse.redirect(`${siteUrl}${dest}`);
}
