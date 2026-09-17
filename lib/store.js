import { all, get, run, ensureSchema, nowISO } from "./db";

function mapEntry(r) {
  return r
    ? {
        id: r.id,
        userId: r.user_id,
        date: r.date,
        title: r.title,
        body: r.body,
        mood: r.mood,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }
    : null;
}

// ============ Entries ============
export async function listEntries(userId) {
  const rows = await all(
    `SELECT * FROM entries WHERE user_id = ?
       ORDER BY date DESC, id DESC`,
    [userId]
  );
  return rows.map(mapEntry);
}

export async function getEntry(userId, id) {
  return mapEntry(
    await get("SELECT * FROM entries WHERE user_id = ? AND id = ?", [userId, id])
  );
}

export async function createEntry(userId, { date, title, body, mood }) {
  const ts = nowISO();
  const res = await run(
    `INSERT INTO entries (user_id, date, title, body, mood, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, date, title, body, mood || null, ts, ts]
  );
  return getEntry(userId, res.lastInsertRowid);
}

export async function updateEntry(userId, id, { date, title, body, mood }) {
  const res = await run(
    `UPDATE entries
        SET date = ?, title = ?, body = ?, mood = ?, updated_at = ?
      WHERE user_id = ? AND id = ?`,
    [date, title, body, mood || null, nowISO(), userId, id]
  );
  if (res.changes === 0) return null;
  return getEntry(userId, id);
}

export async function deleteEntry(userId, id) {
  const res = await run("DELETE FROM entries WHERE user_id = ? AND id = ?", [userId, id]);
  return res.changes > 0;
}

// ============ Reports ============
function mapReport(r) {
  if (!r) return null;
  let payload = {};
  try {
    payload = JSON.parse(r.payload);
  } catch (e) {
    payload = {};
  }
  return {
    id: r.id,
    userId: r.user_id,
    weekStart: r.week_start,
    weekEnd: r.week_end,
    summary: r.summary || payload.summary || "",
    payload,
    createdAt: r.created_at,
  };
}

export async function listReports(userId) {
  const rows = await all(
    "SELECT * FROM reports WHERE user_id = ? ORDER BY week_start DESC",
    [userId]
  );
  return rows.map(mapReport);
}

export async function getReport(userId, id) {
  return mapReport(
    await get("SELECT * FROM reports WHERE id = ? AND user_id = ?", [id, userId])
  );
}

export async function getReportByWeek(userId, weekStart) {
  return mapReport(
    await get("SELECT * FROM reports WHERE user_id = ? AND week_start = ?", [userId, weekStart])
  );
}

export async function saveReport(userId, { weekStart, weekEnd, payload }) {
  const summary = (payload && payload.summary) || "";
  const json = JSON.stringify(payload || {});
  await run(
    `INSERT INTO reports (user_id, week_start, week_end, summary, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id, week_start) DO UPDATE SET
       week_end = excluded.week_end,
       summary = excluded.summary,
       payload = excluded.payload,
       created_at = excluded.created_at`,
    [userId, weekStart, weekEnd, summary, json, nowISO()]
  );
  return getReportByWeek(userId, weekStart);
}

export async function deleteReport(userId, id) {
  const res = await run("DELETE FROM reports WHERE id = ? AND user_id = ?", [id, userId]);
  return res.changes > 0;
}

// ============ Users ============
export async function findUserByEmail(email) {
  return get("SELECT * FROM users WHERE email = ?", [email]);
}

export async function findUserById(id) {
  return get("SELECT id, name, email, created_at FROM users WHERE id = ?", [id]);
}

export async function createUser({ name, email, passwordHash }) {
  const res = await run(
    "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
    [name, email, passwordHash || null, nowISO()]
  );
  return findUserById(res.lastInsertRowid);
}

/**
 * Find or create a user synced from Supabase Auth.
 * Looks up by email; creates if not found (no password_hash — Supabase owns auth).
 */
export async function findOrCreateUserBySupabase({ id: supabaseId, email, name }) {
  const existing = await findUserByEmail(email);
  if (existing) return existing;
  const displayName = name || email.split("@")[0];
  const res = await run(
    "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, NULL, ?)",
    [displayName, email, nowISO()]
  );
  return findUserById(res.lastInsertRowid);
}

export { ensureSchema };
