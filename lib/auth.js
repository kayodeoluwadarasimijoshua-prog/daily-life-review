import crypto from "node:crypto";
import db from "./db";

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

export function createSession(userId) {
  const token = createSessionToken();
  db.prepare("INSERT INTO sessions (token, user_id) VALUES (?, ?)").run(token, userId);
  return token;
}

export function destroySession(token) {
  if (!token) return;
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
}

export function getUserBySessionToken(token) {
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.created_at AS createdAt
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ?`
    )
    .get(token);
  return row || null;
}

export const COOKIE_NAME = "dlr_session";
