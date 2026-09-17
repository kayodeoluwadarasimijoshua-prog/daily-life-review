import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const supabase = createClient();

  // Always use production URL for OAuth redirect — never localhost
  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/api/auth/callback`,
    },
  });

  if (error) {
    console.error("[sign-in-google]", error);
    return NextResponse.redirect(`${origin}/login?error=google_auth_failed`);
  }

  return NextResponse.redirect(data.url);
}
