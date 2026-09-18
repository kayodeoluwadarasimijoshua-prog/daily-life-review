"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEntries } from "../components/useEntries";
import { ReportCard } from "../components/ReportView";
import { SkeletonRows, StatSkeleton, MoodChip, moodDot } from "../components/ui";
import { IconPlus, IconArrowR, IconJournal, IconSparkle, IconCalendar, IconPen, IconClock } from "../components/icons";
import { api, greeting, prettyDate } from "../lib/client";
import { scoreForMood, MOOD_BY_VALUE } from "@/lib/moods";
import {
  currentWeekStartISO, addDaysISO, toISODate, formatWeekRange,
} from "@/lib/dates";

function currentWeekInfo(entries) {
  const ws = currentWeekStartISO();
  const weekDates = [];
  let cur = ws;
  for (let i = 0; i < 7; i++) { weekDates.push(cur); cur = addDaysISO(cur, 1); }
  const byDate = {};
  entries.forEach((e) => { (byDate[e.date] = byDate[e.date] || []).push(e); });

  let count = 0, sum = 0, n = 0, moods = [];
  weekDates.forEach((d) => {
    const list = byDate[d];
    if (list) {
      count += list.length;
      list.forEach((e) => { sum += scoreForMood(e.mood); n++; moods.push(e.mood); });
    }
  });
  const jDays = weekDates.filter((d) => byDate[d] && byDate[d].length > 0).length;
  const avg = n ? sum / n : null;
  // dominant via nearest mood
  let dominantValue = null;
  if (n) {
    const rank = [[5,"great"],[4,"good"],[3,"okay"],[2,"low"],[1,"rough"]].sort((a,b)=>Math.abs(a[0]-avg)-Math.abs(b[0]-avg))[0][1];
    dominantValue = rank;
  }
  // current journal streak up to today
  const today = toISODate();
  let streak = 0;
  let dd = today;
  for (let i = 0; i < 400; i++) {
    if (byDate[dd] && byDate[dd].length) { streak++; } else if (dd !== today) break;
    if (streak === 0) break;
    dd = addDaysISO(dd, -1);
  }
  return { ws, weekDates, count, jDays, avg, dominantValue, streak, byDate };
}

export default function HomePage() {
  const { entries, loading } = useEntries();
  const [reports, setReports] = useState([]);
  const [repLoading, setRepLoading] = useState(true);
  const [reminder, setReminder] = useState(null);
  useEffect(() => {
    let on = true;
    api("/api/reminders")
      .then((d) => { if (on) setReminder(d.reminder); })
      .catch(() => {});
    return () => { on = false; };
  }, []);

  // Resolved on the client so the greeting follows the viewer's own clock,
  // not the server's (Vercel runs in UTC). Re-checks so it flips if the
  // page is left open across a boundary (e.g. 4:59pm -> 5:00pm).
  const [hour, setHour] = useState(null);
  useEffect(() => {
    const tick = () => setHour(new Date().getHours());
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);
  const router = useRouter();

  useEffect(() => {
    let on = true;
    api("/api/reports").then((d) => on && setReports(d.reports || [])).catch(() => {})
      .finally(() => on && setRepLoading(false));
    return () => { on = false; };
  }, []);

  if (loading || repLoading) {
    return (
      <div className="content">
        <div className="pagehead">
          <div><div className="eyebrow" style={{ opacity: 0 }}>.</div><div className="page-title">Dashboard</div></div>
        </div>
        <div className="grid" style={{ gap: 16 }}>
          <StatSkeleton />
          <div className="grid-2"><div className="skel-card" style={{height:220}}/><div className="skel-card" style={{height:220}}/></div>
          <SkeletonRows count={2} />
        </div>
      </div>
    );
  }

  const info = currentWeekInfo(entries);
  const latestReport = reports[0] || null;
  const todayEntries = info.byDate[toISODate()] || [];

  // Show the nudge only once the user's chosen time has passed today.
  const showNudge = (() => {
    if (!reminder?.enabled || hour === null) return false;
    if (todayEntries.length > 0) return false;
    const [h, m] = String(reminder.time || "21:00").split(":").map(Number);
    const now = new Date();
    return hour > h || (hour === h && now.getMinutes() >= m);
  })();
  const currentWeekReport = reports.find((r) => r.weekStart === info.ws) || null;
  const allTime = entries.length;

  const stats = [
    { lb: "This week", vl: info.count, sx: info.count === 1 ? "entry" : "entries" },
    { lb: "Mood this week", vl: info.dominantValue ? MOOD_BY_VALUE[info.dominantValue].emoji : "—", sx: info.dominantValue ? MOOD_BY_VALUE[info.dominantValue].label : "no entries yet", isMood: true },
    { lb: "Journaling streak", vl: `${info.streak}`, sx: info.streak === 1 ? "day in a row" : "days in a row" },
    { lb: "All-time entries", vl: allTime, sx: "lifetime" },
  ];

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <div className="eyebrow"><IconSparkle size={14} /> {formatWeekRange(info.ws)}</div>
          <h1 className="page-title">
            {hour === null ? "Welcome back" : greeting(hour)}.{" "}
            {hour !== null && (hour >= 21 || hour < 5) ? "🌙" : "✨"}
          </h1>
          <p className="page-desc">
            {todayEntries.length > 0
              ? `You've already written ${todayEntries.length > 1 ? todayEntries.length : "a"} note today. ${info.count} ${info.count === 1 ? "entry" : "entries"} so far this week.`
              : `${
                  hour === null
                    ? "A moment to reflect"
                    : hour < 12
                      ? "A fresh day to reflect"
                      : hour < 17
                        ? "A good moment to pause and reflect"
                        : "Time to look back on your day"
                }. You have ${info.count} ${info.count === 1 ? "entry" : "entries"} recorded this week.`}
          </p>
        </div>
        <Link className="btn btn-primary" href="/journal?new=1">
          <IconPlus size={17} /> New entry
        </Link>
      </div>

      {/* in-app nudge: reminder is on, target time passed, nothing written yet */}
      {showNudge && (
        <div className="hero-call mb24">
          <div className="flex gap12" style={{ minWidth: 0 }}>
            <span
              aria-hidden="true"
              style={{
                width: 40, height: 40, borderRadius: 12, flex: "0 0 auto",
                display: "grid", placeItems: "center",
                background: "var(--surface)", color: "var(--brand)",
              }}
            >
              <IconClock size={20} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                You haven’t written today
              </div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>
                Even two lines is enough to keep the thread going.
              </div>
            </div>
          </div>
          <Link className="btn btn-primary btn-sm" href="/journal?new=1">
            <IconPen size={15} /> Write now
          </Link>
        </div>
      )}

      {/* stat tiles — responsive auto-fit grid */}
      <div className="grid mb24" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
        {stats.map((s) => (
          <div className="stat" key={s.lb}>
            <div className="lb">{s.lb}</div>
            <div className="vl">{s.vl}</div>
            <div className="sx">{s.sx}</div>
          </div>
        ))}
      </div>

      {/* this week + report CTA */}
      <div className="mb24" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))" }}>
        <div className="card card-pad">
          <div className="flex between mb16">
            <h3 className="card-title flex gap8"><IconCalendar size={17} style={{ color: "var(--brand)" }} /> This week</h3>
            <span className="muted" style={{ fontSize: 12.5 }}>{info.jDays}/7 days</span>
          </div>
          <div className="dots" style={{ justifyContent: "space-between" }}>
            {["M","T","W","T","F","S","S"].map((l, i) => {
              const d = info.weekDates[i];
              const on = !!(info.byDate[d] && info.byDate[d].length);
              const e = on && info.byDate[d][0];
              return (
                <div className="dotcell" key={d} style={{ flex: 1 }}>
                  <div className="d" title={on ? prettyDate(d) : ""} style={on ? { background: `var(--grad)` } : {}} />
                  <div className="dl">{l}</div>
                  <div style={{ height: 18, display: "grid", placeItems: "center" }}>
                    {on && e ? <span style={{ fontSize: 13 }}>{MOOD_BY_VALUE[e.mood]?.emoji || "•"}</span> : <span style={{ fontSize: 13, color: "var(--ink-4)" }}>·</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex between mt16" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <Link className="btn btn-ghost btn-sm" href="/journal">
              <IconJournal size={15} /> Open journal
            </Link>
            {currentWeekReport ? (
              <Link className="btn btn-soft btn-sm" href="/insights">
                <IconSparkle size={15} /> Review ready
              </Link>
            ) : info.count > 0 ? (
              <Link className="btn btn-soft btn-sm" href="/insights?gen=1">
                <IconSparkle size={15} /> Generate review
              </Link>
            ) : (
              <span className="muted" style={{ fontSize: 12.5 }}>Add notes to unlock your review</span>
            )}
          </div>
        </div>

        {/* latest weekly review preview */}
        <div className="card card-pad">
          <div className="flex between mb16">
            <h3 className="card-title flex gap8"><IconSparkle size={17} style={{ color: "var(--brand)" }} /> Latest weekly review</h3>
            <Link href="/insights" className="flex gap6" style={{ color: "var(--brand-600)", fontWeight: 600, fontSize: 13 }}>
              All insights <IconArrowR size={15} />
            </Link>
          </div>
          {latestReport ? (
            <ReportCard report={latestReport} onOpen={() => router.push(`/insights?r=${latestReport.id}`)} />
          ) : (
            <div style={{ padding: 20, textAlign: "center" }}>
              <span style={{ fontSize: 32 }}>🪄</span>
              <p style={{ marginTop: 10, color: "var(--ink-2)", fontSize: 14, lineHeight: 1.5 }}>
                Your first weekly review hasn't been generated yet. Once you have a few notes, the AI will spot your patterns.
              </p>
              <Link className="btn btn-primary btn-sm mt16" href={info.count ? "/insights?gen=1" : "/journal"}>
                {info.count ? "Generate my first review" : "Start journaling"}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* recent entries */}
      <div className="flex between mb16">
        <h3 className="card-title">Recent entries</h3>
        <Link href="/journal" className="flex gap6" style={{ color: "var(--brand-600)", fontWeight: 600, fontSize: 13 }}>
          View all <IconArrowR size={15} />
        </Link>
      </div>
      {entries.length === 0 ? (
        <div className="empty">
          <div className="art"><IconPen size={30} /></div>
          <h3>No journal entries yet</h3>
          <p>Capture your day in a few honest lines. Little notes add up to big insights about your life.</p>
          <Link href="/journal?new=1" className="btn btn-primary"><IconPlus size={16} /> Write your first entry</Link>
        </div>
      ) : (
        <div className="grid" style={{ gap: 10 }}>
          {entries.slice(0, 5).map((e) => (
            <Link key={e.id} href={`/journal?e=${e.id}`}>
              <div className="card entry" style={{ cursor: "pointer" }}>
                {moodDot(e.mood)}
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="flex between gap12">
                    <h4 style={{ fontSize: 15 }}>{e.title}</h4>
                    <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>{prettyDate(e.date)}</span>
                  </div>
                  <p className="bd" style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{e.body}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
