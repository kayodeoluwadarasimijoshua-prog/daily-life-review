import { NextResponse } from "next/server";
import { getCurrentUser } from "./session";

// Throw to abort; caught by the withAuth() wrapper.
export function unauthorized() {
  return new Error("UNAUTHORIZED");
}

/** Await the signed-in user or throw UNAUTHORIZED. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw unauthorized();
  return user;
}

export function isUnauthorized(err) {
  return err && err.message === "UNAUTHORIZED";
}

// Wrap a handler so unauthenticated calls return 401 cleanly.
export function withAuth(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      if (isUnauthorized(err)) {
        return NextResponse.json({ error: "Please log in to continue." }, { status: 401 });
      }
      throw err;
    }
  };
}
