"use client";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

const KEY = "dlr-theme"; // "light" | "dark" | "system"
const ThemeCtx = createContext({ theme: "system", resolved: "light", setTheme: () => {} });

export function useTheme() {
  return useContext(ThemeCtx);
}

/**
 * Runs before first paint (injected in <head>) so the correct palette is in
 * place immediately — otherwise dark-mode users get a white flash on load.
 * Kept in sync with the logic in ThemeProvider below.
 */
export const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('${KEY}') || 'system';
    var d = t === 'dark' || (t === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (d) document.documentElement.setAttribute('data-theme','dark');
  } catch (e) {}
})();
`;

function systemPrefersDark() {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

function apply(resolved) {
  const el = document.documentElement;
  if (resolved === "dark") el.setAttribute("data-theme", "dark");
  else el.removeAttribute("data-theme");

  // Keep the mobile browser chrome in step with the app background.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#0f1117" : "#6c5ce7");
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("system");
  const [resolved, setResolved] = useState("light");

  // Adopt the value the init script already used.
  useEffect(() => {
    let stored = "system";
    try { stored = localStorage.getItem(KEY) || "system"; } catch {}
    setThemeState(stored);
    const r = stored === "system" ? (systemPrefersDark() ? "dark" : "light") : stored;
    setResolved(r);
    apply(r);
  }, []);

  // Follow the OS while in "system" mode.
  useEffect(() => {
    if (theme !== "system" || typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const r = mq.matches ? "dark" : "light";
      setResolved(r);
      apply(r);
    };
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    try { localStorage.setItem(KEY, next); } catch {}
    const r = next === "system" ? (systemPrefersDark() ? "dark" : "light") : next;
    setResolved(r);
    apply(r);
  }, []);

  return (
    <ThemeCtx.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}
