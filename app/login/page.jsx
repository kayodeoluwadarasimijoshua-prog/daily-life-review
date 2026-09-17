"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthVisual } from "../components/auth-layout";
import { Spinner, FullScreen } from "../components/ui";
import Logo from "../components/Logo";
import { IconArrowR, IconGoogle } from "../components/icons";
import { api } from "../lib/client";

export default function LoginPage() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api("/api/auth/me")
      .then((d) => { if (d.user) router.replace("/"); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/api/auth/login", { method: "POST", body: { email, password } });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = () => {
    setEmail("demo@dailyreview.app");
    setPassword("demo1234");
    setError(null);
  };

  if (checking) return <FullScreen label="Loading…" />;

  return (
    <div className="auth-wrap">
      <AuthVisual />
      <div className="auth-panel">
        <div className="auth-card">
          <Logo />
          <div className="card card-pad mt16">
            <h2 className="auth-title">Welcome back</h2>
            <p className="auth-sub">Log in to revisit your notes and this week&apos;s insights.</p>

            <a href="/api/auth/sign-in-google" className="google-btn mt24">
              <IconGoogle size={20} />
              <span>Continue with Google</span>
            </a>

            <div className="divider"><span>or</span></div>

            <div className="demo-pill" onClick={fillDemo} role="button" tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fillDemo(); }}>
              <span style={{ fontSize: 15 }}>✨</span>
              <span style={{ fontSize: 13 }}>
                <strong>Try the demo:</strong>{" "}
                <span style={{ fontFamily: "monospace" }}>demo@dailyreview.app</span>
              </span>
              <span style={{
                marginLeft: "auto",
                border: "1px solid var(--line)", borderRadius: 6,
                padding: "2px 8px", fontFamily: "monospace", fontSize: 12,
                background: "var(--surface)", whiteSpace: "nowrap",
              }}>demo1234</span>
            </div>

            <form onSubmit={submit} className="mt16">
              <div className="field">
                <label>Email</label>
                <input
                  className={`input ${error ? "err" : ""}`}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  className={`input ${error ? "err" : ""}`}
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              {error && <p className="err-txt mb16" style={{ marginTop: -4 }}>{error}</p>}
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
                {busy ? <Spinner size={17} /> : "Log in"}
              </button>
            </form>

            <div className="flex mt16" style={{ justifyContent: "center", gap: 6, fontSize: 13.5, color: "var(--ink-3)" }}>
              <span>New here?</span>
              <Link href="/signup" className="flex gap6" style={{ color: "var(--brand-600)", fontWeight: 600 }}>
                Create an account <IconArrowR size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
