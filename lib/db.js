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
     password_hash TEXT NOT NULL,
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
];

let migrated = false;
export async function ensureSchema() {
  if (migrated) return;
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
