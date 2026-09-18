"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ReportCard, ReportDetail } from "../../components/ReportView";
import { SkeletonRows, EmptyState, Spinner } from "../../components/ui";
import {
  IconSparkle, IconArrowR, IconBrain, IconRefresh,
} from "../../components/icons";
import { api } from "../../lib/client";
import { currentWeekStartISO, formatWeekRange } from "@/lib/dates";
import { useToast } from "../../components/toast";

const GEN_MSGS = [
  "Reading your week…",
  "Spotting mood patterns…",
  "Looking for themes & habits…",
  "Writing your summary…",
];

export default function InsightsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // report object or null
  const [generating, setGenerating] = useState(false);
  const [genMsgIdx, setGenMsgIdx] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const { err, ok } = useToast();
  const initDone = useRef(false);

  const ws = currentWeekStartISO();
  const currentWeekReport = reports.find((r) => r.weekStart === ws) || null;

  async function loadReports() {
    setLoading(true);
    try {
      const d = await api("/api/reports");
      setReports(d.reports || []);
    } catch (e) {
      err(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, []);

  // handle ?r=<id> and ?gen=1 once data loads
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    const rid = params.get("r");
    if (rid) {
      const found = reports.find((r) => String(r.id) === rid);
      if (found) setSelected(found);
    } else if (params.get("gen") === "1") {
      // auto-generate if current week has no report yet
      if (!currentWeekReport) generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const clearParams = () => router.replace(pathname, { scroll: false });

  async function generate() {
    if (generating) return;
    setGenerating(true);
    setGenMsgIdx(0);
    const iv = setInterval(() => setGenMsgIdx((i) => Math.min(i + 1, GEN_MSGS.length - 1)), 1400);
    try {
      const d = await api("/api/reports/generate", { method: "POST", body: {} });
      const rep = d.report;
      setReports((prev) => {
        const others = prev.filter((r) => r.weekStart !== rep.weekStart);
        return [rep, ...others].sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1));
      });
      setSelected(rep);
      clearParams();
      ok("Your weekly review is ready ✨");
    } catch (e) {
      err(e.message);
    } finally {
      clearInterval(iv);
      setGenerating(false);
    }
  }

  // report meta
  const selWeekLabel = selected ? formatWeekRange(selected.weekStart) : "";
  const selP = (selected && selected.payload) || {};
  const selMood = (selP.moodTrend || {}).dominantValue;
  const selStats = selP.stats || {};

  if (selected) {
    return (
      <div className="content">
        <div className="pagehead">
          <div>
            <button
              className="flex gap6"
              style={{ border: "none", background: "none", color: "var(--brand-600)", fontWeight: 600, fontSize: 13, padding: 0 }}
              onClick={() => setSelected(null)}
            >
              <IconArrowR size={15} style={{ transform: "rotate(180deg)" }} /> Back to all reviews
            </button>
            <div className="eyebrow" style={{ marginTop: 10 }}><IconSparkle size={14} /> Weekly Review</div>
            <h1 className="page-title">{selWeekLabel}</h1>
          </div>
          <button className="btn btn-soft" onClick={() => { setSelected(null); if (!currentWeekReport) generate(); }}>
            <IconSparkle size={16} /> New review
          </button>
        </div>

        <div className="report-hero mb24">
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 className="flex gap8" style={{ alignItems: "center" }}>
              <IconBrain size={20} /> Your week in a nutshell
            </h2>
            <p style={{ marginTop: 12, lineHeight: 1.65, fontSize: 15, opacity: 0.97 }}>{selP.summary || selected.summary}</p>
          </div>
          <div className="badge-row">
            {selMood && <span className="badge-soft">Average mood · {selP.moodTrend?.dominant}</span>}
            <span className="badge-soft">{selStats.totalEntries} entries · {selStats.journaledDays} days</span>
            <span className="badge-soft">Generated {new Date(selected.createdAt || selP.meta?.generatedAt).toLocaleDateString()}</span>
            <span className="badge-soft" title={selP.meta?.model || "Offline lexical engine"}>
              {selP.meta?.engine === "openrouter" ? "✨ AI written" : "Offline engine"}
            </span>
          </div>
        </div>

        <ReportDetail report={selected} />

        <div className="flex gap8 mt24" style={{ flexWrap: "wrap" }}>
          <button className="btn btn-ghost" onClick={() => setSelected(null)}>← All reviews</button>
          <button className="btn btn-soft" onClick={generate} disabled={generating}>
            {generating ? <Spinner size={16} /> : <IconRefresh size={16} />} Regenerate this week
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <div className="eyebrow"><IconSparkle size={14} /> Insights</div>
          <h1 className="page-title">Weekly reviews</h1>
          <p className="page-desc">The AI reads your week and turns scattered notes into clear patterns — moods, themes, wins, and gentle suggestions.</p>
        </div>
      </div>

      {/* generate panel for current week */}
      <div className="card card-pad mb24" style={{ borderColor: currentWeekReport ? "var(--line)" : "#e4defd", background: "linear-gradient(120deg,#fbfaff,#f5f3ff)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <h3 className="card-title flex gap8"><IconSparkle size={18} style={{ color: "var(--brand)" }} /> {formatWeekRange(ws)}</h3>
            <p className="muted mt8" style={{ fontSize: 13.5, lineHeight: 1.5 }}>
              {currentWeekReport
                ? "You already have a review for the current week. Regenerate any time — it'll refresh with your latest notes."
                : "Generate a review from this week's notes. You'll get mood trends, recurring themes, wins, and suggestions for next week."}
            </p>
          </div>
          <button className="btn btn-primary" onClick={generate} disabled={generating} style={{ alignSelf: "flex-start" }}>
            {generating ? <Spinner size={16} /> : currentWeekReport ? <IconRefresh size={17} /> : <IconSparkle size={17} />}
            {generating ? GEN_MSGS[genMsgIdx] : currentWeekReport ? "Regenerate" : "Generate my review"}
          </button>
        </div>
        {generating && (
          <div className="mt16" style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ flex: 1, height: 8, background: "var(--surface-3)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: `${((genMsgIdx + 1) / GEN_MSGS.length) * 100}%`, height: "100%", background: "var(--grad)", borderRadius: 999, transition: "width .4s ease" }} />
            </div>
          </div>
        )}
      </div>

      {/* history */}
      <div className="flex between mb16">
        <h3 className="card-title">Past reviews</h3>
        {!loading && reports.length > 0 && (
          <span className="muted" style={{ fontSize: 13 }}>{reports.length} {reports.length === 1 ? "review" : "reviews"}</span>
        )}
      </div>

      {loading ? (
        <SkeletonRows count={3} />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={<IconSparkle size={30} />}
          title="No reviews yet"
          body="Once you've jotted down a few days of notes, generate a weekly review to see your patterns come to life."
          action={
            <button className="btn btn-primary" onClick={generate} disabled={generating}>
              {generating ? <Spinner size={16} /> : <IconSparkle size={16} />} Generate my first review
            </button>
          }
        />
      ) : (
        <div className="grid" style={{ gap: 12 }}>
          {reports.map((r) => (
            <ReportCard
              key={r.id}
              report={r}
              onOpen={() => { setSelected(r); clearParams(); }}
              footer={
                <div className="flex between mt16" style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    {r.weekStart === ws ? "● Current week" : (r.payload?.stats ? `${r.payload.stats.totalEntries} entries` : "")}
                  </span>
                  <span className="flex gap6" style={{ color: "var(--brand-600)", fontWeight: 600, fontSize: 13 }}>
                    Read review <IconArrowR size={15} />
                  </span>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
