"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Logo from "../components/Logo";
import { IconRefresh, IconShield, IconSearch, IconHeart } from "../components/icons";

const KIND_META = {
  idea:   { label: "Idea",    emoji: "\u{1F4A1}" },
  bug:    { label: "Problem", emoji: "\u{1F41E}" },
  praise: { label: "Praise",  emoji: "\u{1F49C}" },
  other:  { label: "Other",   emoji: "\u{1F4AC}" },
};

const FILTERS = [
  { id: "all",    label: "All" },
  { id: "bug",    label: "\u{1F41E} Problems" },
  { id: "idea",   label: "\u{1F4A1} Ideas" },
  { id: "praise", label: "\u{1F49C} Praise" },
  { id: "other",  label: "\u{1F4AC} Other" },
];

function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso.replace(" ", "T") + (iso.endsWith("Z") ? "" : "Z"));
  const s = Math.max(0, (Date.now() - then.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return then.toLocaleDateString();
}

export default function AdminPage() {
  const [phase, setPhase] = useState("checking"); // checking | setup | login | ready
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [items, setItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/feedback/list", { cache: "no-store" });
      if (res.status === 401) { setPhase("login"); setItems(null); return; }
      if (!res.ok) throw new Error(`Request failed (${res.status}).`);
      const data = await res.json();
      setItems(data.items || []);
      setPhase("ready");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount: has a password been set, and am I already unlocked?
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/auth", { cache: "no-store" });
        const d = await res.json();
        if (!d.configured) setPhase("setup");
        else if (d.unlocked) load();
        else setPhase("login");
      } catch {
        setPhase("login");
      }
    })();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          phase === "setup" ? { password: pw, confirm } : { password: pw }
        ),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Something went wrong.");
      setPw(""); setConfirm("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const lock = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    setItems(null); setPhase("login"); setPw("");
  };

  const stats = useMemo(() => {
    if (!items) return null;
    const rated = items.filter((i) => i.rating);
    const avg = rated.length
      ? (rated.reduce((a, i) => a + i.rating, 0) / rated.length).toFixed(1)
      : "\u2014";
    return {
      total: items.length,
      bugs: items.filter((i) => i.kind === "bug").length,
      ideas: items.filter((i) => i.kind === "idea").length,
      avg,
    };
  }, [items]);

  const shown = useMemo(() => {
    if (!items) return [];
    const needle = q.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && i.kind !== filter) return false;
      if (!needle) return true;
      return (
        String(i.message || "").toLowerCase().includes(needle) ||
        String(i.email || "").toLowerCase().includes(needle) ||
        String(i.name || "").toLowerCase().includes(needle)
      );
    });
  }, [items, filter, q]);

  /* ---------------- password gate ---------------- */
  if (phase === "checking") {
    return (
      <div className="auth-panel" style={{ minHeight: "100dvh" }}>
        <div className="auth-card"><div className="skel-card" style={{ height: 220 }} /></div>
      </div>
    );
  }

  if (phase === "setup" || phase === "login") {
    const isSetup = phase === "setup";
    return (
      <div className="auth-panel" style={{ minHeight: "100dvh" }}>
        <div className="auth-card">
          <Logo />
          <div className="card card-pad mt16">
            <h2 className="auth-title flex gap8">
              <IconShield size={20} style={{ color: "var(--brand)" }} />
              {isSetup ? "Set your admin password" : "Admin"}
            </h2>
            <p className="auth-sub">
              {isSetup
                ? "Choose a password to protect the feedback inbox. You'll use this every time \u2014 pick something you'll remember."
                : "Enter your admin password to read submitted feedback."}
            </p>

            <form className="mt24" onSubmit={submit}>
              <div className="field">
                <label htmlFor="pw">{isSetup ? "New password" : "Password"}</label>
                <input
                  id="pw"
                  type="password"
                  className={`input ${error ? "err" : ""}`}
                  value={pw}
                  onChange={(e) => { setPw(e.target.value); setError(null); }}
                  placeholder={isSetup ? "At least 8 characters" : "Your admin password"}
                  autoComplete={isSetup ? "new-password" : "current-password"}
                  autoFocus
                  required
                />
              </div>

              {isSetup && (
                <div className="field">
                  <label htmlFor="cf">Confirm password</label>
                  <input
                    id="cf"
                    type="password"
                    className="input"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                    placeholder="Type it again"
                    autoComplete="new-password"
                    required
                  />
                </div>
              )}

              {error && <p className="err-txt mb16" style={{ marginTop: -4 }}>{error}</p>}

              <button className="btn btn-primary btn-block" disabled={busy || !pw}>
                {busy ? "Please wait\u2026" : isSetup ? "Set password & continue" : "Unlock"}
              </button>
            </form>

            {isSetup && (
              <p className="muted mt16" style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                Stored as a salted scrypt hash \u2014 never in plain text. This screen
                only appears once.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- dashboard ---------------- */
  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      <div className="content" style={{ padding: "28px 16px 60px" }}>
        <div className="pagehead">
          <div>
            <div className="eyebrow"><IconHeart size={14} /> Feedback inbox</div>
            <h1 className="page-title">Admin</h1>
            <p className="page-desc">Everything people have sent from Settings.</p>
          </div>
          <div className="flex gap8">
            <button
              className="btn btn-ghost btn-sm"
              onClick={load}
              disabled={loading}
            >
              <IconRefresh size={15} /> {loading ? "Loading…" : "Refresh"}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={lock}
            >
              Lock
            </button>
          </div>
        </div>

        {/* stats */}
        {stats && (
          <div
            className="grid mb24"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}
          >
            <div className="stat"><div className="lb">Total</div><div className="vl">{stats.total}</div><div className="sx">messages</div></div>
            <div className="stat"><div className="lb">Problems</div><div className="vl">{stats.bugs}</div><div className="sx">reported</div></div>
            <div className="stat"><div className="lb">Ideas</div><div className="vl">{stats.ideas}</div><div className="sx">suggested</div></div>
            <div className="stat"><div className="lb">Avg rating</div><div className="vl">{stats.avg}</div><div className="sx">out of 5</div></div>
          </div>
        )}

        {/* controls */}
        <div className="card card-pad mb16">
          <div className="searchbox mb16">
            <IconSearch size={16} />
            <input
              className="input"
              placeholder="Search messages, names, emails…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex gap6" style={{ flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className="chip"
                style={{
                  cursor: "pointer", border: "1.5px solid",
                  borderColor: filter === f.id ? "var(--brand)" : "var(--line)",
                  background: filter === f.id ? "var(--brand-soft)" : "var(--surface)",
                  color: filter === f.id ? "var(--brand-600)" : "var(--ink-2)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* list */}
        {loading && !items && <div className="skel-card" style={{ height: 120 }} />}

        {items && shown.length === 0 && (
          <div className="empty">
            <div className="art">📭</div>
            <h3>{items.length === 0 ? "No feedback yet" : "Nothing matches"}</h3>
            <p>
              {items.length === 0
                ? "When someone sends feedback from Settings, it will appear here."
                : "Try a different search or filter."}
            </p>
          </div>
        )}

        <div className="grid" style={{ gap: 12 }}>
          {shown.map((f) => {
            const meta = KIND_META[f.kind] || KIND_META.other;
            return (
              <div key={f.id} className="card card-pad">
                <div className="flex between gap12 mb16" style={{ flexWrap: "wrap" }}>
                  <span className="flex gap8" style={{ minWidth: 0 }}>
                    <span className="chip" style={{ background: "var(--surface-2)", color: "var(--ink-2)" }}>
                      {meta.emoji} {meta.label}
                    </span>
                    {f.rating ? (
                      <span className="chip" style={{ background: "var(--warn-soft)", color: "var(--warn)" }}>
                        {"⭐".repeat(f.rating)}
                      </span>
                    ) : null}
                  </span>
                  <span className="muted" style={{ fontSize: 12.5 }}>{timeAgo(f.createdAt)}</span>
                </div>

                <p style={{ fontSize: 14.5, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {f.message}
                </p>

                <div
                  className="flex between gap12 mt16"
                  style={{ flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid var(--line)" }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600 }}>
                    {f.name || "Anonymous"}
                    {f.email && (
                      <a
                        href={`mailto:${f.email}`}
                        className="muted"
                        style={{ fontWeight: 500, marginLeft: 8, textDecoration: "underline" }}
                      >
                        {f.email}
                      </a>
                    )}
                  </span>
                  {f.userAgent && (
                    <span
                      className="muted"
                      title={f.userAgent}
                      style={{
                        fontSize: 11.5, maxWidth: 260, overflow: "hidden",
                        textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {f.userAgent}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
