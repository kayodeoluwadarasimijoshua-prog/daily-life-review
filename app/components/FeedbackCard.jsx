"use client";
import React, { useState } from "react";
import { IconHeart, IconCheck, IconArrowR } from "./icons";
import { api } from "../lib/client";
import { useToast } from "./toast";

const KINDS = [
  { id: "idea",   label: "Idea",   emoji: "💡" },
  { id: "bug",    label: "Problem", emoji: "🐞" },
  { id: "praise", label: "Praise", emoji: "💜" },
  { id: "other",  label: "Other",  emoji: "💬" },
];

const PLACEHOLDERS = {
  idea: "What would make this app more useful for you?",
  bug: "What went wrong? What were you doing just before it happened?",
  praise: "What's working well for you?",
  other: "Anything you'd like to tell us…",
};

const MAX = 4000;

export default function FeedbackCard() {
  const [kind, setKind] = useState("idea");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const toast = useToast();

  const submit = async (e) => {
    e.preventDefault();
    const text = message.trim();
    if (text.length < 5) {
      toast.err("Please write a little more.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/feedback", {
        method: "POST",
        body: { kind, rating: rating || undefined, message: text },
      });
      setSent(true);
      setMessage("");
      setRating(0);
      toast.ok("Thank you — your feedback was sent.");
    } catch (err) {
      toast.err(err.message || "Couldn't send that. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="card card-pad" style={{ textAlign: "center" }}>
        <div
          aria-hidden="true"
          style={{
            width: 56, height: 56, margin: "4px auto 14px", borderRadius: 16,
            display: "grid", placeItems: "center",
            background: "var(--good-soft)", color: "var(--good)",
          }}
        >
          <IconCheck size={26} />
        </div>
        <h3 className="card-title" style={{ fontSize: 16 }}>Thank you</h3>
        <p className="card-sub mt8" style={{ lineHeight: 1.6 }}>
          Your feedback has been recorded. It genuinely helps shape what gets
          built next.
        </p>
        <button
          type="button"
          className="btn btn-ghost btn-sm mt16"
          onClick={() => setSent(false)}
        >
          Send more feedback
        </button>
      </div>
    );
  }

  return (
    <div className="card card-pad">
      <h3 className="card-title flex gap8 mb16">
        <IconHeart size={18} style={{ color: "var(--brand)" }} /> Send feedback
      </h3>
      <p className="card-sub" style={{ lineHeight: 1.6 }}>
        Found something broken, or thought of something that would help? Tell us —
        it goes straight to the people building this.
      </p>

      <form onSubmit={submit} className="mt16">
        {/* type */}
        <div
          role="radiogroup"
          aria-label="Feedback type"
          style={{
            display: "grid", gap: 8,
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          }}
        >
          {KINDS.map((k) => {
            const on = kind === k.id;
            return (
              <button
                key={k.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setKind(k.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 4, padding: "10px 2px", borderRadius: 12, minWidth: 0,
                  fontSize: 11.5, fontWeight: 600, lineHeight: 1.2,
                  cursor: "pointer",
                  color: on ? "var(--brand-600)" : "var(--ink-2)",
                  background: on ? "var(--brand-soft)" : "var(--surface)",
                  border: `1.5px solid ${on ? "var(--brand)" : "var(--line)"}`,
                  transition: "all .15s",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>
                  {k.emoji}
                </span>
                {k.label}
              </button>
            );
          })}
        </div>

        {/* rating */}
        <div className="field mt16" style={{ marginBottom: 12 }}>
          <label id="rating-label">How are you finding the app?</label>
          <div
            role="radiogroup"
            aria-labelledby="rating-label"
            className="flex gap6"
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                onClick={() => setRating(rating === n ? 0 : n)}
                style={{
                  width: 40, height: 40, borderRadius: 10, border: "none",
                  background: "transparent", cursor: "pointer",
                  fontSize: 22, lineHeight: 1, padding: 0,
                  filter: n <= rating ? "none" : "grayscale(1)",
                  opacity: n <= rating ? 1 : 0.35,
                  transition: "opacity .15s, filter .15s, transform .1s",
                }}
              >
                ⭐
              </button>
            ))}
            {rating > 0 && (
              <span className="muted" style={{ fontSize: 12.5, alignSelf: "center" }}>
                {rating}/5
              </span>
            )}
          </div>
        </div>

        {/* message */}
        <div className="field" style={{ marginBottom: 8 }}>
          <label htmlFor="fb-msg">Your message</label>
          <textarea
            id="fb-msg"
            className="textarea"
            value={message}
            maxLength={MAX}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={PLACEHOLDERS[kind]}
            style={{ minHeight: 110 }}
            required
          />
          <div className="flex between">
            <span className="muted" style={{ fontSize: 12 }}>
              Sent with your name and email so we can follow up.
            </span>
            <span
              className="muted"
              style={{ fontSize: 12, color: message.length > MAX - 200 ? "var(--warn)" : undefined }}
            >
              {message.length}/{MAX}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block mt8"
          disabled={busy || message.trim().length < 5}
        >
          {busy ? "Sending…" : <>Send feedback <IconArrowR size={16} /></>}
        </button>
      </form>
    </div>
  );
}
