"use client";
import React, { useCallback, useEffect, useState } from "react";
import Logo from "../components/Logo";
import { Spinner } from "../components/ui";
import {
  IconShield, IconHeart, IconJournal, IconSparkle, IconRefresh,
  IconTrash, IconCheck, IconLogout,
} from "../components/icons";

const KIND_META = {
  idea:   { emoji: "💡", label: "Idea" },
  bug:    { emoji: "🐞", label: "Problem" },
  praise: { emoji: "💜", label: "Praise" },
  other:  { emoji: "💬", label: "Other" },
};

const fmt = (iso) => {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
};

export default function AdminPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [token, setToken] = useState("");
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);

  const [stats, setStats] = useState(null);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, f] = await Promise.all([
        fetch("/api/admin/stats").then((r) => r.json()),
        fetch("/api/admin/feedback").then((r) => r.json()),
      ]);
      if (s.stats) setStats(s.stats);
      if (f.items) setItems(f.items);
    } finally {
      setLoading(false);
    }
  }, []);

  // Is there already a valid admin cookie?
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/stats");
        if (r.ok) {
          setUnlocked(true);
          await load();
        }
      } catch {}
      setChecking(false);
    })();
  }, [load]);

  const unlock = async (e) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Couldn't unlock.");
      setUnlocked(true);
      setToken("");
      await load();
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const lock = async () => {
    await fetch("/api/admin/login", { method: "DELETE" });
    setUnlocked(false);
    setStats(null);
    setItems([]);
  };

  const mark = async (id, status) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, status } : i)));
    await fetch("/api/admin/feedback", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  };

  const remove = async (id) => {
    if (!confirm("Delete this feedback permanently?")) return;
    setItems((list) => list.filter((i) => i.id !== id));
    await fetch("/api/admin/feedback", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  };

  if (checking) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100dvh" }}>
        <Spinner />
      </div>
    );
  }

  /* ---------------- unlock screen ---------------- */
  if (!unlocked) {
    return (
      <div className="auth-panel" style={{ minHeight: "100dvh" }}>
        <div className="auth-card">
          <Logo />
          <form onSubmit={unlock} className="card card-pad mt16">
            <h2 className="auth-title flex gap8">
              <IconShield size={20} style={{ color: "var(--brand)" }} /> Admin
            </h2>
            <p className="auth-sub">
              Enter the admin token to view feedback and app stats.
            </p>
            <div className="field mt16">
              <label htmlFor="tok">Admin token</label>
              <input
                id="tok"
                className={`input ${err ? "err" : ""}`}
                type="password"
                value={token}
                autoFocus
                onChange={(e) => { setToken(e.target.value); setErr(null); }}
                placeholder="••••••••••••"
              />
            </div>
            {err && <p className="err-txt mb16" style={{ marginTop: -8 }}>{err}</p>}
            <button className="btn btn-primary btn-block" disabled={busy || !token.trim()}>
              {busy ? "Checking…" : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ---------------- dashboard ---------------- */
  const shown = items.filter((i) => {
    if (filter === "all") return true;
    if (filter === "unread") return i.status === "new";
    return i.kind === filter;
  });

  const tiles = stats
    ? [
        { lb: "Users", vl: stats.users, sx: `+${stats.users7} this week` },
        { lb: "Entries", vl: stats.entries, sx: `+${stats.entries7} this week` },
        { lb: "Reports", vl: stats.reports, sx: "AI reviews generated" },
        {
          lb: "Feedback",
          vl: stats.feedback.total,
          sx: stats.feedback.unread ? `${stats.feedback.unread} unread` : "all read",
        },
        {
          lb: "Avg rating",
          vl: stats.feedback.avgRating ? `${stats.feedback.avgRating}★` : "—",
          sx: "out of 5",
        },
        { lb: "Push devices", vl: stats.subs, sx: "subscribed" },
      ]
    : [];

  return (
    <div className="main" style={{ paddingTop: 28 }}>
      <div className="content">
        <div className="pagehead">
          <div>
            <div className="eyebrow"><IconShield size={14} /> Admin</div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-desc">Feedback and usage across the whole app.</p>
          </div>
          <div className="flex gap8">
            <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
              <IconRefresh size={15} className={loading ? "spin" : ""} /> Refresh
            </button>
            <button className="btn btn-ghost btn-sm" onClick={lock}>
              <IconLogout size={15} /> Lock
            </button>
          </div>
        </div>

        {/* stat tiles */}
        <div
          className="grid mb24"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}
        >
          {tiles.map((s) => (
            <div className="stat" key={s.lb}>
              <div className="lb">{s.lb}</div>
              <div className="vl">{s.vl}</div>
              <div className="sx">{s.sx}</div>
            </div>
          ))}
        </div>

        {/* filters */}
        <div className="flex gap8 mb16" style={{ flexWrap: "wrap" }}>
          {[
            { id: "all", label: `All (${items.length})` },
            { id: "unread", label: `Unread (${items.filter((i) => i.status === "new").length})` },
            ...Object.entries(KIND_META).map(([id, m]) => ({
              id,
              label: `${m.emoji} ${m.label} (${items.filter((i) => i.kind === id).length})`,
            })),
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="chip"
              style={{
                cursor: "pointer",
                border: `1.5px solid ${filter === f.id ? "var(--brand)" : "var(--line)"}`,
                background: filter === f.id ? "var(--brand-soft)" : "var(--surface)",
                color: filter === f.id ? "var(--brand-600)" : "var(--ink-2)",
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* feedback list */}
        {shown.length === 0 ? (
          <div className="empty">
            <div className="art"><IconHeart size={28} /></div>
            <h3>No feedback here yet</h3>
            <p>
              When people send feedback from Settings it will appear here,
              newest first.
            </p>
          </div>
        ) : (
          <div className="grid" style={{ gap: 12 }}>
            {shown.map((f) => {
              const m = KIND_META[f.kind] || KIND_META.other;
              const unread = f.status === "new";
              return (
                <div
                  key={f.id}
                  className="card card-pad"
                  style={{
                    borderLeft: `3px solid ${unread ? "var(--brand)" : "var(--line)"}`,
                  }}
                >
                  <div className="flex between gap12 mb8" style={{ flexWrap: "wrap" }}>
                    <div className="flex gap8" style={{ minWidth: 0, flexWrap: "wrap" }}>
                      <span className="tag">{m.emoji} {m.label}</span>
                      {f.rating && (
                        <span className="chip m-great">{"★".repeat(f.rating)}</span>
                      )}
                      {unread && (
                        <span className="chip" style={{ background: "var(--brand-soft)", color: "var(--brand-600)" }}>
                          New
                        </span>
                      )}
                    </div>
                    <span className="muted" style={{ fontSize: 12 }}>{fmt(f.createdAt)}</span>
                  </div>

                  <p style={{ fontSize: 14.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                    {f.message}
                  </p>

                  <div
                    className="flex between gap12 mt16"
                    style={{ flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid var(--line)" }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{f.name || "Anonymous"}</div>
                      <div className="muted" style={{ fontSize: 12, wordBreak: "break-all" }}>
                        {f.email || "no email"}
                      </div>
                    </div>
                    <div className="flex gap8">
                      {unread ? (
                        <button className="btn btn-soft btn-sm" onClick={() => mark(f.id, "read")}>
                          <IconCheck size={14} /> Mark read
                        </button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" onClick={() => mark(f.id, "new")}>
                          Mark unread
                        </button>
                      )}
                      <button className="btn btn-danger-ghost btn-sm" onClick={() => remove(f.id)}>
                        <IconTrash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* recent signups */}
        {stats?.recentUsers?.length > 0 && (
          <div className="card card-pad mt24">
            <h3 className="card-title flex gap8 mb16">
              <IconJournal size={17} style={{ color: "var(--brand)" }} /> Recent signups
            </h3>
            {stats.recentUsers.map((u) => (
              <div key={u.id} className="rowitem">
                <div className="grow" style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{u.name}</div>
                  <div className="muted" style={{ fontSize: 12, wordBreak: "break-all" }}>
                    {u.email}
                  </div>
                </div>
                <span className="muted" style={{ fontSize: 12 }}>{fmt(u.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
