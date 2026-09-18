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
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resending, setResending] = useState(false);
  const [notice, setNotice] = useState(null);
  const router = useRouter();

  useEffect(() => {
    // Surface messages passed back from the Supabase callback (expired link…).
    try {
      const p = new URLSearchParams(window.location.search);
      const e = p.get("error");
      if (e) {
        setError(e);
        window.history.replaceState({}, "", window.location.pathname);
      }
    } catch {}

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
      // Offer a one-click resend when the account exists but isn't verified.
      setUnconfirmed(Boolean(err?.data?.needsConfirmation));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await api("/api/auth/resend", { method: "POST", body: { email } });
      setError(null);
      setUnconfirmed(false);
      setNotice(`Verification email sent to ${email}. Check your inbox.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
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

            <form onSubmit={submit}>
              <div className="field">
                <label>Email</label>
                <input
                  className={`input ${error ? "err" : ""}`}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); setUnconfirmed(false); setNotice(null); }}
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
              {unconfirmed && (
                <button
                  type="button"
                  onClick={resend}
                  disabled={resending}
                  className="btn btn-soft btn-block mb16"
                  style={{ marginTop: -4 }}
                >
                  {resending ? "Sending…" : "Resend verification email"}
                </button>
              )}
              {notice && (
                <p
                  className="mb16"
                  style={{ marginTop: -4, fontSize: 13.5, fontWeight: 600, color: "var(--good)" }}
                >
                  {notice}
                </p>
              )}
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
