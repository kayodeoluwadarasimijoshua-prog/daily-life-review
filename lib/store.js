import db from "./db";

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
export function listEntries(userId) {
  const rows = db
    .prepare(
      `SELECT * FROM entries WHERE user_id = ?
         ORDER BY date DESC, id DESC`
    )
    .all(userId);
  return rows.map(mapEntry);
}

export function getEntry(userId, id) {
  return mapEntry(
    db.prepare("SELECT * FROM entries WHERE user_id = ? AND id = ?").get(userId, id)
  );
}

export function createEntry(userId, { date, title, body, mood }) {
  const info = db
    .prepare(
      `INSERT INTO entries (user_id, date, title, body, mood)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(userId, date, title, body, mood || null);
  return getEntry(userId, info.lastInsertRowid);
}

export function updateEntry(userId, id, { date, title, body, mood }) {
  const info = db
    .prepare(
      `UPDATE entries
          SET date = ?, title = ?, body = ?, mood = ?, updated_at = datetime('now')
        WHERE user_id = ? AND id = ?`
    )
    .run(date, title, body, mood || null, userId, id);
  if (info.changes === 0) return null;
  return getEntry(userId, id);
}

export function deleteEntry(userId, id) {
  const info = db
    .prepare("DELETE FROM entries WHERE user_id = ? AND id = ?")
    .run(userId, id);
  return info.changes > 0;
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

export function listReports(userId) {
  const rows = db
    .prepare("SELECT * FROM reports WHERE user_id = ? ORDER BY week_start DESC")
    .all(userId);
  return rows.map(mapReport);
}

export function getReport(userId, id) {
  return mapReport(db.prepare("SELECT * FROM reports WHERE id = ? AND user_id = ?").get(id, userId));
}

export function getReportByWeek(userId, weekStart) {
  return mapReport(
    db.prepare("SELECT * FROM reports WHERE user_id = ? AND week_start = ?").get(userId, weekStart)
  );
}

export function saveReport(userId, { weekStart, weekEnd, payload }) {
  const summary = (payload && payload.summary) || "";
  const json = JSON.stringify(payload || {});
  db.prepare(
    `INSERT INTO reports (user_id, week_start, week_end, summary, payload)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, week_start) DO UPDATE SET
       week_end = excluded.week_end,
       summary = excluded.summary,
       payload = excluded.payload,
       created_at = datetime('now')`
  ).run(userId, weekStart, weekEnd, summary, json);
  return getReportByWeek(userId, weekStart);
}

export function deleteReport(userId, id) {
  const info = db
    .prepare("DELETE FROM reports WHERE id = ? AND user_id = ?")
    .run(id, userId);
  return info.changes > 0;
}
