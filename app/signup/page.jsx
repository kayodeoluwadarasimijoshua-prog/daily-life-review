"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthVisual } from "../components/auth-layout";
import { Spinner, FullScreen } from "../components/ui";
import Logo from "../components/Logo";
import { IconArrowR, IconGoogle } from "../components/icons";
import { api } from "../lib/client";

export default function SignupPage() {
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  // Set when Supabase requires the user to click a verification link.
  const [sentTo, setSentTo] = useState(null);
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
      const res = await api("/api/auth/register", {
        method: "POST",
        body: { name, email, password },
      });

      // No session yet — the account needs email verification. Redirecting
      // now would just bounce the user back to /login with no explanation.
      if (res?.needsConfirmation) {
        setSentTo(res.email || email);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (checking) return <FullScreen label="Loading…" />;

  // Account created, but Supabase needs the email verified before sign-in.
  if (sentTo) {
    return (
      <div className="auth-wrap">
        <AuthVisual />
        <div className="auth-panel">
          <div className="auth-card">
            <Logo />
            <div className="card card-pad mt16" style={{ textAlign: "center" }}>
              <div
                aria-hidden="true"
                style={{
                  width: 64, height: 64, margin: "4px auto 18px", borderRadius: 18,
                  display: "grid", placeItems: "center",
                  background: "var(--brand-soft)", fontSize: 30,
                }}
              >
                ✉️
              </div>
              <h2 className="auth-title">Check your inbox</h2>
              <p className="auth-sub">
                We sent a verification link to <strong style={{ color: "var(--ink)" }}>{sentTo}</strong>.
                Click it to activate your account, then sign in.
              </p>
              <p className="muted mt16" style={{ fontSize: 13, lineHeight: 1.6 }}>
                Can’t find it? Check your spam or promotions folder — it can take a
                minute to arrive.
              </p>
              <Link href="/login" className="btn btn-primary btn-block mt24">
                Go to sign in <IconArrowR size={16} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <AuthVisual />
      <div className="auth-panel">
        <div className="auth-card">
          <Logo />
          <div className="card card-pad mt16">
            <h2 className="auth-title">Create your journal</h2>
            <p className="auth-sub">Start turning ordinary days into a clearer picture of your life.</p>

            <a href="/api/auth/sign-in-google" className="google-btn mt24">
              <IconGoogle size={20} />
              <span>Continue with Google</span>
            </a>

            <div className="divider"><span>or</span></div>

            <form onSubmit={submit} className="mt8">
              <div className="field">
                <label>Your name</label>
                <input className="input" value={name} onChange={(e) => { setName(e.target.value); setError(null); }} placeholder="e.g. Amara" required minLength={2} />
              </div>
              <div className="field">
                <label>Email</label>
                <input className={`input ${error ? "err" : ""}`} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="you@example.com" required autoComplete="email" />
              </div>
              <div className="field">
                <label>Password</label>
                <input className={`input ${error ? "err" : ""}`} type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} placeholder="At least 8 characters" required minLength={8} autoComplete="new-password" />
              </div>
              {error && <p className="err-txt mb16" style={{ marginTop: -4 }}>{error}</p>}
              <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy}>
                {busy ? <Spinner size={17} /> : "Create account"}
              </button>
            </form>

            <div className="flex mt16" style={{ justifyContent: "center", gap: 6, fontSize: 13.5, color: "var(--ink-3)" }}>
              <span>Already have an account?</span>
              <Link href="/login" className="flex gap6" style={{ color: "var(--brand-600)", fontWeight: 600 }}>
                Log in <IconArrowR size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
