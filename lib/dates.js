// Small date helpers. All ISO dates are YYYY-MM-DD in LOCAL time.
export function toISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// parse an ISO date string into a local Date at midnight
export function parseISODate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}

export function isValidISODate(iso) {
  return !!parseISODate(iso);
}

export function addDays(d, n) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

// Monday of the week containing `d` (ISO: Monday=1).
export function startOfWeek(d) {
  const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = nd.getDay(); // 0 Sun .. 6 Sat
  const diff = dow === 0 ? -6 : 1 - dow; // shift to Monday
  nd.setDate(nd.getDate() + diff);
  return nd;
}

export function endOfWeek(d) {
  return addDays(startOfWeek(d), 6); // Sunday
}

export function mondayOfISO(iso) {
  const d = parseISODate(iso);
  if (!d) return null;
  return toISODate(startOfWeek(d));
}

export function addDaysISO(iso, n) {
  const d = parseISODate(iso);
  if (!d) return null;
  return toISODate(addDays(d, n));
}

// Week start (Monday) containing today as an ISO string.
export function currentWeekStartISO() {
  return toISODate(startOfWeek(new Date()));
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DOW = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// "Sep 8 – Sep 14, 2026"
export function formatWeekRange(weekStartISO) {
  const start = parseISODate(weekStartISO);
  if (!start) return "";
  const end = addDays(start, 6);
  const sMon = MONTHS[start.getMonth()];
  const eMon = MONTHS[end.getMonth()];
  const year = end.getFullYear();
  if (sMon === eMon) return `${sMon} ${start.getDate()} – ${end.getDate()}, ${year}`;
  return `${sMon} ${start.getDate()} – ${eMon} ${end.getDate()}, ${year}`;
}

// "Mon, Sep 9"
export function formatShort(iso) {
  const d = parseISODate(iso);
  if (!d) return "";
  return `${DOW[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

// "Monday, September 9"
export function formatLong(iso) {
  const d = parseISODate(iso);
  if (!d) return "";
  return `${DOW[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function relativeDay(iso) {
  const today = toISODate();
  if (iso === today) return "Today";
  if (iso === addDaysISO(today, -1)) return "Yesterday";
  if (iso === addDaysISO(today, 1)) return "Tomorrow";
  return formatLong(iso);
}
