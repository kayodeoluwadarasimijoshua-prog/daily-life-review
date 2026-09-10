import { cookies } from "next/headers";
import { COOKIE_NAME, getUserBySessionToken } from "./auth";

export const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  secure: false, // runs behind the preview/host proxy
  maxAge: MAX_AGE,
};

export function setSessionCookie(token) {
  cookies().set(COOKIE_NAME, token, cookieOpts);
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", { ...cookieOpts, maxAge: 0 });
}

/** Returns the current user object (server-side) or null. */
export async function getCurrentUser() {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  const user = await getUserBySessionToken(token);
  return user || null;
}

/** Returns the current session token or null. */
export function getSessionToken() {
  return cookies().get(COOKIE_NAME)?.value || null;
}

/** Data returned by the client 'me' endpoint (no session token leaked). */
export function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}
