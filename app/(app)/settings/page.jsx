"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "../../components/ui";
import {
  IconSettings, IconShield, IconSparkle, IconJournal, IconLogout, IconHeart,
} from "../../components/icons";
import { api, prettyDate } from "../../lib/client";
import ReminderCard from "../../components/ReminderCard";
import ThemeCard from "../../components/ThemeCard";
import FeedbackCard from "../../components/FeedbackCard";

export default function SettingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const me = await api("/api/auth/me");
        const sys = await api("/api/system");
        const ents = await api("/api/entries");
        const reps = await api("/api/reports");
        if (!on) return;
        setData({
          user: me.user,
          sys,
          entries: ents.entries || [],
          reports: reps.reports || [],
        });
      } catch (e) {
        /* handled by redirect on 401 */
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => { on = false; };
  }, []);

  const logout = async () => {
    setLoggingOut(true);
    try { await api("/api/auth/logout", { method: "POST", body: {} }); } catch (e) {}
    router.push("/login");
    router.refresh();
  };

  if (loading || !data) {
    return (
      <div className="content">
        <div className="pagehead"><h1 className="page-title">Settings</h1></div>
        <div className="grid-2" style={{ display: "grid", gap: 16 }}>
          <div className="skel-card" style={{ height: 200 }} />
          <div className="skel-card" style={{ height: 200 }} />
        </div>
      </div>
    );
  }

  const { user, sys, entries, reports } = data;
  const days = new Set(entries.map((e) => e.date)).size;
  const init = user ? user.name.trim().charAt(0).toUpperCase() : "U";

  return (
    <div className="content">
      <div className="pagehead">
        <div>
          <div className="eyebrow"><IconSettings size={14} /> Settings</div>
          <h1 className="page-title">Account & preferences</h1>
          <p className="page-desc">Manage your profile, see what powers your insights, and understand your data.</p>
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))" }}>
        {/* Profile */}
        <div className="card card-pad">
          <h3 className="card-title mb16">Profile</h3>
          <div className="flex gap16" style={{ alignItems: "center" }}>
            <div className="avatar" style={{ width: 60, height: 60, borderRadius: 18, fontSize: 22 }}>{init}</div>
            <div>
              <h4 style={{ fontSize: 17 }}>{user?.name}</h4>
              <p className="muted" style={{ fontSize: 13.5 }}>{user?.email}</p>
              <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
                {user?.createdAt ? `Member since ${prettyDate(user.createdAt.split(" ")[0])}` : "Member"}
              </p>
            </div>
          </div>
          <div className="mt16" style={{ borderTop: "1px solid var(--line)", paddingTop: 16 }}>
            <button className="btn btn-danger-ghost" onClick={logout} disabled={loggingOut}>
              {loggingOut ? <Spinner size={16} /> : <IconLogout size={16} />} Log out
            </button>
          </div>
        </div>

        {/* Appearance */}
        <ThemeCard />

        {/* Daily reminder */}
        <ReminderCard />

        {/* AI engine */}
        <div className="card card-pad">
          <h3 className="card-title flex gap8 mb16"><IconSparkle size={18} style={{ color: "var(--brand)" }} /> AI analysis engine</h3>
          <p className="card-sub" style={{ lineHeight: 1.6 }}>
            {sys?.provider && sys.provider !== "local"
              ? "Weekly reviews are written by a large language model. Your entries for the week are sent to the AI provider to generate the review, then the result is stored in your account."
              : "Weekly reviews are produced by an on-device lexical engine (sentiment, theme & pattern analysis) — no account or API key needed, and your notes never leave the app."}
          </p>
          <div className="mt16" style={{ background: "var(--surface-2)", borderRadius: 11, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <IconShield size={18} style={{ color: sys?.provider && sys.provider !== "local" ? "var(--brand)" : "var(--good)" }} />
            <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-2)" }}>
              Active: {sys?.providerStatus || "Local engine (offline)"}
            </span>
          </div>
          <p className="muted mt8" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
            {sys?.provider && sys.provider !== "local"
              ? "If the AI provider is unreachable, out of credits, or returns an unusable response, the app automatically falls back to the offline engine so your review always generates."
              : <>The engine is swappable: set an <code>OPENROUTER_API_KEY</code> env var to connect a real LLM without changing the app.</>}
          </p>
        </div>

        {/* Feedback */}
        <FeedbackCard />

        {/* Data summary */}
        <div className="card card-pad">
          <h3 className="card-title flex gap8 mb16"><IconJournal size={18} style={{ color: "var(--brand)" }} /> Your data</h3>
          <p className="card-sub">All of it lives privately on this device in a local database.</p>
          <div className="grid mt16" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 10 }}>
            <div className="stat"><div className="lb">Entries</div><div className="vl">{entries.length}</div></div>
            <div className="stat"><div className="lb">Journal days</div><div className="vl">{days}</div></div>
            <div className="stat"><div className="lb">Reviews</div><div className="vl">{reports.length}</div></div>
          </div>
        </div>

        {/* about */}
        <div className="card card-pad">
          <h3 className="card-title flex gap8 mb16"><IconHeart size={18} style={{ color: "var(--brand)" }} /> About Daily Life Review</h3>
          <p className="card-sub" style={{ lineHeight: 1.7 }}>
            A gentle journaling companion for everyday people. Write a few honest lines each day — the AI quietly reads your weeks and surfaces the patterns your busy brain misses: the habits that lift you, the themes that keep returning, the moments worth protecting.
          </p>
          <p className="muted mt16" style={{ fontSize: 12.5 }}>Version {sys?.version} · Built with Next.js + SQLite</p>
        </div>
      </div>
    </div>
  );
}
