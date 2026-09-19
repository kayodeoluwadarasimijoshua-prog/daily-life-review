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

// ============ Reminders ============

const DEFAULT_REMINDER = {
  enabled: false,
  pushEnabled: false,
  time: "21:00",
  tzOffset: 0,
  lastSentOn: null,
};

function mapReminder(r) {
  if (!r) return { ...DEFAULT_REMINDER };
  return {
    enabled: !!r.enabled,
    pushEnabled: !!r.push_enabled,
    time: r.reminder_time || "21:00",
    tzOffset: Number(r.tz_offset) || 0,
    lastSentOn: r.last_sent_on || null,
  };
}

export async function getReminder(userId) {
  await ensureSchema();
  const row = await get("SELECT * FROM reminders WHERE user_id = ?", [userId]);
  return mapReminder(row);
}

export async function saveReminder(userId, { enabled, pushEnabled, time, tzOffset }) {
  await ensureSchema();
  const cur = await getReminder(userId);

  const next = {
    enabled: enabled === undefined ? cur.enabled : !!enabled,
    pushEnabled: pushEnabled === undefined ? cur.pushEnabled : !!pushEnabled,
    time: time === undefined ? cur.time : time,
    tzOffset: tzOffset === undefined ? cur.tzOffset : Number(tzOffset) || 0,
  };

  await run(
    `INSERT INTO reminders (user_id, enabled, push_enabled, reminder_time, tz_offset, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       enabled = excluded.enabled,
       push_enabled = excluded.push_enabled,
       reminder_time = excluded.reminder_time,
       tz_offset = excluded.tz_offset,
       updated_at = excluded.updated_at`,
    [userId, next.enabled ? 1 : 0, next.pushEnabled ? 1 : 0, next.time, next.tzOffset, nowISO()]
  );

  return getReminder(userId);
}

export async function markReminderSent(userId, isoDate) {
  await ensureSchema();
  await run("UPDATE reminders SET last_sent_on = ? WHERE user_id = ?", [isoDate, userId]);
}

// Every user with reminders switched on (used by the cron job).
export async function listActiveReminders() {
  await ensureSchema();
  const rows = await all(
    `SELECT r.*, u.name, u.email
       FROM reminders r
       JOIN users u ON u.id = r.user_id
      WHERE r.enabled = 1`
  );
  return rows.map((r) => ({
    userId: r.user_id,
    name: r.name,
    email: r.email,
    ...mapReminder(r),
  }));
}

// ============ Push subscriptions ============

export async function savePushSub(userId, { endpoint, keys }) {
  await ensureSchema();
  await run(
    `INSERT INTO push_subs (endpoint, user_id, p256dh, auth, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       user_id = excluded.user_id,
       p256dh  = excluded.p256dh,
       auth    = excluded.auth`,
    [endpoint, userId, keys.p256dh, keys.auth, nowISO()]
  );
}

export async function listPushSubs(userId) {
  await ensureSchema();
  const rows = await all("SELECT * FROM push_subs WHERE user_id = ?", [userId]);
  return rows.map((r) => ({
    endpoint: r.endpoint,
    keys: { p256dh: r.p256dh, auth: r.auth },
  }));
}

export async function deletePushSub(endpoint) {
  await ensureSchema();
  await run("DELETE FROM push_subs WHERE endpoint = ?", [endpoint]);
}

// ============ Feedback ============

export const FEEDBACK_KINDS = ["idea", "bug", "praise", "other"];

export async function createFeedback({
  userId, name, email, kind, rating, message, userAgent,
}) {
  await ensureSchema();
  const res = await run(
    `INSERT INTO feedback (user_id, name, email, kind, rating, message, user_agent, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    [
      userId ?? null,
      name || null,
      email || null,
      FEEDBACK_KINDS.includes(kind) ? kind : "other",
      Number.isFinite(rating) ? rating : null,
      message,
      userAgent ? String(userAgent).slice(0, 300) : null,
      nowISO(),
    ]
  );
  return Number(res.lastInsertRowid);
}

// How many pieces of feedback this user has already sent today
// (used to rate-limit submissions).
export async function countFeedbackToday(userId) {
  await ensureSchema();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const row = await get(
    "SELECT COUNT(*) AS n FROM feedback WHERE user_id = ? AND created_at > ?",
    [userId, since]
  );
  return Number(row?.n || 0);
}

export async function listFeedback({ limit = 200 } = {}) {
  await ensureSchema();
  const rows = await all(
    `SELECT f.*, u.email AS user_email
       FROM feedback f
       LEFT JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
      LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    name: r.name,
    email: r.email || r.user_email,
    kind: r.kind,
    rating: r.rating,
    message: r.message,
    userAgent: r.user_agent,
    status: r.status,
    createdAt: r.created_at,
  }));
}

export async function setFeedbackStatus(id, status) {
  await ensureSchema();
  const allowed = ["new", "read", "done"];
  if (!allowed.includes(status)) return false;
  await run("UPDATE feedback SET status = ? WHERE id = ?", [status, id]);
  return true;
}

export async function deleteFeedback(id) {
  await ensureSchema();
  await run("DELETE FROM feedback WHERE id = ?", [id]);
}

// Aggregate numbers for the admin dashboard.
export async function adminStats() {
  await ensureSchema();
  const one = async (sql, args = []) => Number((await get(sql, args))?.n || 0);
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();

  const [users, entries, reports, fbTotal, fbNew, users7, entries7, subs] =
    await Promise.all([
      one("SELECT COUNT(*) AS n FROM users"),
      one("SELECT COUNT(*) AS n FROM entries"),
      one("SELECT COUNT(*) AS n FROM reports"),
      one("SELECT COUNT(*) AS n FROM feedback"),
      one("SELECT COUNT(*) AS n FROM feedback WHERE status = 'new'"),
      one("SELECT COUNT(*) AS n FROM users WHERE created_at > ?", [since7]),
      one("SELECT COUNT(*) AS n FROM entries WHERE created_at > ?", [since7]),
      one("SELECT COUNT(*) AS n FROM push_subs"),
    ]);

  const avgRow = await get(
    "SELECT AVG(rating) AS a FROM feedback WHERE rating IS NOT NULL"
  );
  const avgRating = avgRow?.a ? Math.round(Number(avgRow.a) * 10) / 10 : null;

  const byKind = await all(
    "SELECT kind, COUNT(*) AS n FROM feedback GROUP BY kind ORDER BY n DESC"
  );

  const recentUsers = await all(
    `SELECT id, name, email, created_at FROM users
      ORDER BY created_at DESC LIMIT 10`
  );

  return {
    users, entries, reports, subs,
    users7, entries7,
    feedback: { total: fbTotal, unread: fbNew, avgRating },
    byKind: byKind.map((r) => ({ kind: r.kind, n: Number(r.n) })),
    recentUsers: recentUsers.map((r) => ({
      id: r.id, name: r.name, email: r.email, createdAt: r.created_at,
    })),
  };
}

/* ---------------- app settings (admin password) ---------------- */

export async function getSetting(key) {
  await ensureSchema();
  const row = await get(`SELECT value FROM app_settings WHERE key = ?`, [key]);
  return row ? row.value : null;
}

export async function setSetting(key, value) {
  await ensureSchema();
  await run(
    `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, value, nowISO()]
  );
}

export const ADMIN_PW_KEY = "admin_password_hash";

export { ensureSchema };
