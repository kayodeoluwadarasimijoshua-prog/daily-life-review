import crypto from "node:crypto";
import { get, run } from "./db";

// ---- password hashing (scrypt, no native deps) -------------------------
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

// ---- session tokens ------------------------------------------------------
export function createSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId) {
  const token = createSessionToken();
  await run("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", [
    token,
    userId,
    new Date().toISOString(),
  ]);
  return token;
}

export async function destroySession(token) {
  if (!token) return;
  await run("DELETE FROM sessions WHERE token = ?", [token]);
}

export async function getUserBySessionToken(token) {
  if (!token) return null;
  return get(
    `SELECT u.id, u.name, u.email, u.created_at AS createdAt
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token = ?`,
    [token]
  );
}

export const COOKIE_NAME = "dlr_session";
