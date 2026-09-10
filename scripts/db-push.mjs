// Creates the schema (and optional seed) against whatever database
// TURSO_DATABASE_URL points at. Useful for provisioning a fresh Turso DB.
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL is not set. Add it to .env.local or export it.");
  process.exit(1);
}

const client = createClient(authToken ? { url, authToken } : { url });

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     name TEXT NOT NULL,
     email TEXT NOT NULL UNIQUE,
     password_hash TEXT NOT NULL,
     created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS entries (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     date TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, mood TEXT,
     created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date)`,
  `CREATE INDEX IF NOT EXISTS idx_entries_user ON entries(user_id)`,
  `CREATE TABLE IF NOT EXISTS reports (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     week_start TEXT NOT NULL, week_end TEXT NOT NULL,
     summary TEXT, payload TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_user_week ON reports(user_id, week_start)`,
];

for (const stmt of SCHEMA) {
  await client.execute(stmt);
}
const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log("Schema ready. Tables:", res.rows.map((r) => r.name ?? r[0]).join(", "));
