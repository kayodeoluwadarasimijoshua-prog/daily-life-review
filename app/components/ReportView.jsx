"use client";
import React from "react";
import { MOOD_BY_VALUE } from "@/lib/moods";
import { formatWeekRange } from "@/lib/dates";
import { MoodChip } from "./ui";
import { IconTrend, IconHeart, IconSparkle, IconAlert, IconBrain } from "./icons";

function usePayload(report) {
  const p = report?.payload && typeof report.payload === "object" ? report.payload : {};
  const fallback = report?.summary ? { summary: report.summary } : {};
  return { ...fallback, ...p };
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function scoreColor(score) {
  const nearest = [5, 4, 3, 2, 1].sort((a, b) => Math.abs(a - score) - Math.abs(b - score))[0];
  const map = {
    5: "#0aa66a", 4: "#12b76a", 3: "#5c8df5", 2: "#f0a832", 1: "#ea5455",
  };
  return map[nearest] || "#cfd4e6";
}

// ------- compact summary card (used in list / dashboard preview) -------
export function ReportCard({ report, onOpen, footer }) {
  const p = usePayload(report);
  const t = p.moodTrend || {};
  const themes = (p.themes || []).slice(0, 3).map((x) => x.name);
  return (
    <div className="card card-pad" style={{ cursor: onOpen ? "pointer" : "default" }} onClick={onOpen}>
      <div className="flex between gap12">
        <div className="eyebrow" style={{ margin: 0 }}>{formatWeekRange(report.weekStart)}</div>
        <MoodChip value={t.dominantValue} />
      </div>
      <h4 style={{ fontSize: 16, margin: "8px 0 4px" }}>{p.summary || "Weekly review"}</h4>
      <div className="flex gap8 mt8" style={{ flexWrap: "wrap", gap: 6 }}>
        {themes.map((th) => (
          <span key={th} className="tag" style={{ background: "var(--surface-2)", color: "var(--ink-2)" }}>{th}</span>
        ))}
      </div>
      {footer}
    </div>
  );
}

// ------- mood trend bar chart -------
function MoodTrendChart({ trend }) {
  const days = trend?.days || [];
  const hasAny = days.some((d) => d.score != null && d.score != undefined);
  return (
    <div>
      <div className="flex between mb16">
        <h4 className="card-title">Mood through the week</h4>
        {trend?.dominant && <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>Avg · {trend.dominant}</span>}
      </div>
      {!hasAny ? (
        <p className="muted" style={{ fontSize: 14 }}>No mood data for this week.</p>
      ) : (
        <div className="moodbar">
          {days.map((d, i) => {
            const filled = d.score != null && d.score !== undefined;
            const pct = filled ? Math.max(12, (d.score / 5) * 100) : 0;
            const color = filled ? scoreColor(d.score) : "#edeff6";
            const m = MOOD_BY_VALUE[d.mood];
            return (
              <div className="col" key={d.date}>
                <span style={{ fontSize: 18 }}>{filled && m ? m.emoji : ""}</span>
                <div className="bar" style={{ height: pct + "%", background: color }} title={m ? m.label : ""} />
                <span className="lbl">{DAY_LABELS[i]}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="flex" style={{ justifyContent: "space-between", marginTop: 10 }}>
        <span className="muted" style={{ fontSize: 11.5 }}>Mon</span>
        <span className="muted" style={{ fontSize: 11.5 }}>Sun</span>
      </div>
    </div>
  );
}

// ------- themes with proportional bars -------
function Themes({ themes }) {
  if (!themes || themes.length === 0) return null;
  const max = themes[0]?.count || 1;
  return (
    <div>
      <div className="mb16"><h4 className="card-title">Key themes</h4></div>
      <div style={{ display: "grid", gap: 12 }}>
        {themes.map((t) => (
          <div key={t.name}>
            <div className="flex between mb16" style={{ marginBottom: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t.name}</span>
              <span className="muted" style={{ fontSize: 12 }}>{t.count}×{t.distinctDays > 1 ? ` · ${t.distinctDays} days` : ""}</span>
            </div>
            <div style={{ height: 8, background: "var(--surface-3)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${(t.count / max) * 100}%`, height: "100%", background: "var(--grad)", borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DotList({ items, kind }) {
  if (!items || items.length === 0) return null;
  const isWin = kind === "win";
  return (
    <div>
      <div className="flex between mb16">
        <h4 className="card-title flex gap8">
          {isWin ? <IconHeart size={18} style={{ color: "var(--good)" }} /> : <IconAlert size={18} style={{ color: "var(--bad)" }} />}
          {isWin ? "Wins to celebrate" : "Worth gentle attention"}
        </h4>
      </div>
      {items.map((it, i) => (
        <div className="rowitem" key={i}>
          <span className="list-dot" style={{ background: isWin ? "var(--good)" : "var(--warn)" }} />
          <div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{it.title || it.date}</div>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 3, lineHeight: 1.5 }}>{it.text}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function PatternList({ patterns }) {
  if (!patterns || patterns.length === 0) return null;
  return (
    <div>
      <div className="mb16"><h4 className="card-title flex gap8"><IconSparkle size={18} style={{ color: "var(--brand)" }} /> Patterns I noticed</h4></div>
      {patterns.map((t, i) => (
        <div className="sug-item" key={i}>
          <span className="list-dot" />
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{t}</p>
        </div>
      ))}
    </div>
  );
}

function SuggestionList({ suggestions }) {
  if (!suggestions || suggestions.length === 0) return null;
  return (
    <div>
      <div className="mb16"><h4 className="card-title flex gap8"><IconBrain size={18} style={{ color: "var(--brand-2)" }} /> Gentle suggestions for next week</h4></div>
      {suggestions.map((t, i) => (
        <div className="sug-item" key={i}>
          <span className="list-dot" style={{ background: "var(--brand-2)" }} />
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{t}</p>
        </div>
      ))}
    </div>
  );
}

// ------- full detail renderer -------
export function ReportDetail({ report }) {
  const p = usePayload(report);
  const t = p.moodTrend || {};
  return (
    <div className="grid" style={{ gap: 16 }}>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
        <div className="card card-pad"><MoodTrendChart trend={t} /></div>
        <div className="card card-pad"><Themes themes={p.themes} /></div>
      </div>
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))" }}>
        {(p.wins && p.wins.length > 0) && (
          <div className="card card-pad"><DotList items={p.wins} kind="win" /></div>
        )}
        {(p.challenges && p.challenges.length > 0) && (
          <div className="card card-pad"><DotList items={p.challenges} kind="challenge" /></div>
        )}
      </div>
      {p.patterns && p.patterns.length > 0 && (
        <div className="card card-pad"><PatternList patterns={p.patterns} /></div>
      )}
      {p.suggestions && p.suggestions.length > 0 && (
        <div className="card card-pad"><SuggestionList suggestions={p.suggestions} /></div>
      )}
    </div>
  );
}

export { IconTrend };
