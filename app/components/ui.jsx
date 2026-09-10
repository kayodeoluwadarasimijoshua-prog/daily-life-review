"use client";
import React, { useEffect } from "react";
import { MOODS, MOOD_BY_VALUE } from "@/lib/moods";
import { IconX } from "./icons";

// ---- Spinner ----
export function Spinner({ size = 18, className = "" }) {
  return (
    <svg
      className={`spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
    >
      <path d="M21 12a9 9 0 1 1-6.2-8.6" />
    </svg>
  );
}

export function FullScreen({ label }) {
  return (
    <div className="auth-wrap" style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", color: "var(--ink-2)" }}>
        <Spinner size={30} style={{ color: "var(--brand)" }} />
        <p style={{ marginTop: 14, fontWeight: 600 }}>{label || "Loading…"}</p>
      </div>
    </div>
  );
}

// ---- Modal ----
export function Modal({ open, onClose, title, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose && onClose()}>
      <div className="modal" style={wide ? { maxWidth: 720 } : {}}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="x-btn" onClick={onClose} aria-label="Close">
            <IconX size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ---- Empty state ----
export function EmptyState({ icon, title, body, action }) {
  return (
    <div className="empty">
      <div className="art">{icon || <span style={{ fontSize: 28 }}>📓</span>}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

// ---- Mood helpers ----
export function MoodChip({ value, big }) {
  const m = MOOD_BY_VALUE[value];
  if (!m) return null;
  return (
    <span className={`chip m-${value}`} style={big ? { fontSize: 13, padding: "5px 11px" } : {}}>
      <span>{m.emoji}</span>
      {m.label}
    </span>
  );
}

export function MoodPicker({ value, onChange, disabled }) {
  return (
    <div className="mood-picker">
      {MOODS.map((m) => {
        const on = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            disabled={disabled}
            className={`mood-opt ${on ? "on" : ""}`}
            onClick={() => onChange(on ? null : m.value)}
          >
            <span className="emo">{m.emoji}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

// small colored dot by mood value
export function moodDot(value, size = 11) {
  const m = MOOD_BY_VALUE[value];
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: m ? m.color : "#cfd4e6",
        display: "inline-block",
        flex: "0 0 auto",
      }}
    />
  );
}

// ---- Skeletons ----
export function SkeletonRows({ count = 3 }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card card-pad">
          <div className="flex between">
            <div style={{ flex: 1 }}>
              <div className="sk" style={{ height: 15, width: "38%" }} />
              <div className="sk" style={{ height: 12, width: "22%", marginTop: 10 }} />
              <div className="sk" style={{ height: 12, width: "86%", marginTop: 12 }} />
            </div>
            <div className="sk" style={{ width: 40, height: 40, borderRadius: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="grid grid-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="stat">
          <div className="sk" style={{ height: 11, width: "60%" }} />
          <div className="sk" style={{ height: 26, width: "40%", marginTop: 10 }} />
        </div>
      ))}
    </div>
  );
}
