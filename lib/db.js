import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

// ------------------------------------------------------------------------
// Database connection.
//
// Two modes, same code path:
//   • Local / self-hosted  → SQLite file (no config needed)
//   • Vercel / serverless  → remote Turso (libSQL) over HTTP
//
// Set TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) to use a hosted database.
// DATA_DIR optionally relocates the local file onto a persistent disk.
// ------------------------------------------------------------------------

function localFileUrl() {
  const dir = process.env.DATA_DIR
    ? path.resolve(process.env.DATA_DIR)
    : path.join(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return `file:${path.join(dir, "app.db")}`;
}

const url = process.env.TURSO_DATABASE_URL || localFileUrl();
const authToken = process.env.TURSO_AUTH_TOKEN;

export const usingRemoteDb = !url.startsWith("file:");
export const dbUrlLabel = usingRemoteDb ? "Turso (remote libSQL)" : "local SQLite file";

const client = authToken ? createClient({ url, authToken }) : createClient({ url });

// libSQL returns rows that are array-like with named properties; normalise
// them into plain objects for the rest of the app.
function rowsToObjects(rs) {
  const cols = rs.columns;
  return rs.rows.map((row) => {
    const o = {};
    cols.forEach((c, i) => {
      o[c] = row[i];
    });
    return o;
  });
}

/** SELECT returning an array of plain row objects. */
export async function all(sql, args = []) {
  const rs = await client.execute({ sql, args });
  return rowsToObjects(rs);
}

/** SELECT returning the first row (or null). */
export async function get(sql, args = []) {
  const rs = await client.execute({ sql, args });
  const rows = rowsToObjects(rs);
  return rows[0] ?? null;
}

/** INSERT/UPDATE/DELETE. Returns { lastInsertRowid, changes }. */
export async function run(sql, args = []) {
  const rs = await client.execute({ sql, args });
  return {
    // libSQL returns a BigInt for lastInsertRowid — normalise to Number.
    lastInsertRowid: rs.lastInsertRowid != null ? Number(rs.lastInsertRowid) : null,
    changes: Number(rs.rowsAffected || 0),
  };
}

// ---- schema ------------------------------------------------------------
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     name          TEXT NOT NULL,
     email         TEXT NOT NULL UNIQUE,
     password_hash TEXT,
     created_at    TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token      TEXT PRIMARY KEY,
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS entries (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     date       TEXT NOT NULL,
     title      TEXT NOT NULL,
     body       TEXT NOT NULL,
     mood       TEXT,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_entries_user ON entries(user_id)`,
  `CREATE TABLE IF NOT EXISTS reports (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     week_start TEXT NOT NULL,
     week_end   TEXT NOT NULL,
     summary    TEXT,
     payload    TEXT NOT NULL,
     created_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_user_week ON reports(user_id, week_start)`,
  // Daily reminder preferences (one row per user).
  // reminder_time is "HH:MM" in the user's own local time; tz_offset is the
  // minutes returned by Date.getTimezoneOffset() so the server can work out
  // when that local time occurs in UTC.
  `CREATE TABLE IF NOT EXISTS reminders (
     user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     enabled       INTEGER NOT NULL DEFAULT 0,
     push_enabled  INTEGER NOT NULL DEFAULT 0,
     reminder_time TEXT NOT NULL DEFAULT '21:00',
     tz_offset     INTEGER NOT NULL DEFAULT 0,
     last_sent_on  TEXT,
     updated_at    TEXT NOT NULL
   )`,
  // Web Push subscriptions. A user may have several (phone, laptop…).
  `CREATE TABLE IF NOT EXISTS push_subs (
     endpoint   TEXT PRIMARY KEY,
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     p256dh     TEXT NOT NULL,
     auth       TEXT NOT NULL,
     created_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subs(user_id)`,
  // User-submitted feedback. user_id is nullable so a deleted account's
  // feedback survives (ON DELETE SET NULL rather than CASCADE).
  `CREATE TABLE IF NOT EXISTS feedback (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
     name       TEXT,
     email      TEXT,
     kind       TEXT NOT NULL DEFAULT 'idea',
     rating     INTEGER,
     message    TEXT NOT NULL,
     user_agent TEXT,
     status     TEXT NOT NULL DEFAULT 'new',
     created_at TEXT NOT NULL
   )`,
  `CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at DESC)`,
  // Small key/value store for app-wide settings (e.g. the admin password hash).
  `CREATE TABLE IF NOT EXISTS app_settings (
     key        TEXT PRIMARY KEY,
     value      TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
];

let migrated = false;
export async function ensureSchema() {
  if (migrated) return;

  // Migration: make password_hash nullable for Supabase/OAuth users
  // SQLite doesn't support ALTER COLUMN, so we recreate the table if needed.
  try {
    const tableInfo = await client.execute("PRAGMA table_info(users)");
    const pwCol = tableInfo.rows.find((r) => r[1] === "password_hash");
    if (pwCol && pwCol[3] === 1) {
      // password_hash is NOT NULL (r[3] === 1) — migrate
      console.log("[db] Migrating users table: making password_hash nullable…");
      await client.execute(`CREATE TABLE IF NOT EXISTS users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        created_at TEXT NOT NULL
      )`);
      await client.execute(`INSERT INTO users_new (id, name, email, password_hash, created_at)
        SELECT id, name, email, password_hash, created_at FROM users`);
      await client.execute("DROP TABLE users");
      await client.execute("ALTER TABLE users_new RENAME TO users");
      console.log("[db] Migration complete.");
    }
  } catch (e) {
    // Table might not exist yet — that's fine, CREATE TABLE IF NOT EXISTS will handle it
  }

  // Remove demo account and its data (one-time cleanup)
  try {
    const demo = await client.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: ["demo@dailyreview.app"],
    });
    if (demo.rows.length > 0) {
      const demoId = demo.rows[0][0];
      await client.execute({ sql: "DELETE FROM entries WHERE user_id = ?", args: [demoId] });
      await client.execute({ sql: "DELETE FROM reports WHERE user_id = ?", args: [demoId] });
      await client.execute({ sql: "DELETE FROM sessions WHERE user_id = ?", args: [demoId] });
      await client.execute({ sql: "DELETE FROM users WHERE id = ?", args: [demoId] });
      console.log("[db] Removed demo account and data.");
    }
  } catch (e) {
    // Ignore — table might not exist yet
  }

  for (const stmt of SCHEMA) {
    await client.execute(stmt);
  }
  migrated = true;
}

/** ISO timestamp for TEXT columns (avoids dialect-specific date defaults). */
export function nowISO() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

export default client;
