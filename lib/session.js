import { createClient, isSupabaseConfigured } from "./supabase/server";
import { get, run } from "./db";
import { findUserById, findOrCreateUserBySupabase } from "./store";

/**
 * Returns the current app user (from Turso) by checking the Supabase session.
 * Falls back to legacy cookie-based session if Supabase is not configured.
 */
export async function getCurrentUser() {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { data: { user: supaUser } } = await supabase.auth.getUser();
    if (!supaUser) return null;

    // Sync Supabase user → Turso user table
    const appUser = await findOrCreateUserBySupabase({
      id: supaUser.id,
      email: supaUser.email,
      name: supaUser.user_metadata?.full_name || supaUser.user_metadata?.name || supaUser.email?.split("@")[0],
    });
    return appUser;
  }

  // Legacy fallback: cookie-based session from the sessions table
  const { cookies } = await import("next/headers");
  const { COOKIE_NAME, getUserBySessionToken } = await import("./auth");
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return getUserBySessionToken(token) || null;
}

/**
 * Data returned by the client 'me' endpoint (no sensitive fields leaked).
 */
export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt || user.created_at };
}
