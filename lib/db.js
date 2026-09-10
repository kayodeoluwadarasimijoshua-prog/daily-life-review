import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

// DATA_DIR lets hosting platforms point the DB at a persistent mounted disk
// (e.g. /var/data on Render/Railway). Falls back to ./data for local use.
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(process.cwd(), "data");

if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "app.db");

// WAL for better concurrency under the dev/prod server.
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token      TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entries (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date       TEXT NOT NULL,                -- YYYY-MM-DD
      title      TEXT NOT NULL,
      body       TEXT NOT NULL,
      mood       TEXT,                         -- optional mood tag value
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_entries_user_date ON entries(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_entries_user ON entries(user_id);

    CREATE TABLE IF NOT EXISTS reports (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      week_start  TEXT NOT NULL,               -- Monday YYYY-MM-DD
      week_end    TEXT NOT NULL,               -- Sunday YYYY-MM-DD
      summary     TEXT,
      payload     TEXT NOT NULL,               -- JSON structure of the full report
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_user_week
      ON reports(user_id, week_start);
  `);
}

migrate();

export default db;
