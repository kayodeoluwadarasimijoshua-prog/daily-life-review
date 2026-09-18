"use client";
import React from "react";
import { useTheme } from "./theme";

const OPTIONS = [
  { id: "light",  label: "Light",  hint: "Always bright" },
  { id: "dark",   label: "Dark",   hint: "Always dim" },
  { id: "system", label: "System", hint: "Match device" },
];

/* Tiny visual preview of each palette */
function Swatch({ mode }) {
  const dark = mode === "dark";
  const bg = dark ? "#0f1117" : "#f6f7fc";
  const surface = dark ? "#171a23" : "#ffffff";
  const line = dark ? "#272c39" : "#e8eaf4";
  const ink = dark ? "#eef0f6" : "#13162b";
  const ink3 = dark ? "#848b9e" : "#b7bbcd";

  if (mode === "system") {
    return (
      <span
        aria-hidden="true"
        style={{
          display: "block", height: 46, borderRadius: 9, overflow: "hidden",
          border: "1px solid var(--line)", position: "relative",
          background: "linear-gradient(90deg, #f6f7fc 0 50%, #0f1117 50% 100%)",
        }}
      >
        <span style={{ position: "absolute", inset: 0, display: "flex" }}>
          <span style={{ flex: 1, padding: 6 }}>
            <span style={{ display: "block", height: 5, width: "70%", borderRadius: 3, background: "#13162b" }} />
            <span style={{ display: "block", height: 4, width: "45%", borderRadius: 3, background: "#b7bbcd", marginTop: 4 }} />
          </span>
          <span style={{ flex: 1, padding: 6 }}>
            <span style={{ display: "block", height: 5, width: "70%", borderRadius: 3, background: "#eef0f6" }} />
            <span style={{ display: "block", height: 4, width: "45%", borderRadius: 3, background: "#848b9e", marginTop: 4 }} />
          </span>
        </span>
      </span>
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        display: "block", height: 46, borderRadius: 9, background: bg,
        border: `1px solid ${line}`, padding: 6,
      }}
    >
      <span
        style={{
          display: "block", background: surface, border: `1px solid ${line}`,
          borderRadius: 6, padding: 5, height: "100%",
        }}
      >
        <span style={{ display: "block", height: 5, width: "70%", borderRadius: 3, background: ink }} />
        <span style={{ display: "block", height: 4, width: "45%", borderRadius: 3, background: ink3, marginTop: 4 }} />
      </span>
    </span>
  );
}

export default function ThemeCard() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="card card-pad">
      <h3 className="card-title flex gap8 mb16">
        <span aria-hidden="true" style={{ fontSize: 17, lineHeight: 1 }}>🌗</span>
        Appearance
      </h3>
      <p className="card-sub" style={{ lineHeight: 1.6 }}>
        Choose how the app looks. “System” follows your phone or computer’s
        own light/dark setting.
      </p>

      <div
        role="radiogroup"
        aria-label="Theme"
        className="mt16"
        style={{
          display: "grid", gap: 10,
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        }}
      >
        {OPTIONS.map((o) => {
          const on = theme === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setTheme(o.id)}
              style={{
                textAlign: "left", padding: 8, borderRadius: 12,
                background: on ? "var(--brand-soft)" : "var(--surface)",
                border: `1.5px solid ${on ? "var(--brand)" : "var(--line)"}`,
                transition: "border-color .15s, background .15s",
                cursor: "pointer", minWidth: 0,
              }}
            >
              <Swatch mode={o.id} />
              <span
                style={{
                  display: "block", marginTop: 8, fontSize: 13, fontWeight: 700,
                  color: on ? "var(--brand-600)" : "var(--ink)",
                }}
              >
                {o.label}
              </span>
              <span
                className="muted"
                style={{ display: "block", fontSize: 11.5, lineHeight: 1.4 }}
              >
                {o.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
