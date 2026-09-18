"use client";
import React, { useEffect, useState } from "react";
import { IconClock, IconCheck, IconAlert } from "./icons";
import { api } from "../lib/client";
import { useToast } from "./toast";

/* base64url VAPID key -> Uint8Array, as the Push API requires */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

const pushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// iOS only allows web push once the app is installed to the Home Screen.
const isIOS = () =>
  typeof navigator !== "undefined" &&
  /iPad|iPhone|iPod/.test(navigator.userAgent);

const isStandalone = () =>
  typeof window !== "undefined" &&
  (window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.navigator?.standalone === true);

export default function ReminderCard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [time, setTime] = useState("21:00");
  const [vapidKey, setVapidKey] = useState(null);
  const [perm, setPerm] = useState("default");
  const toast = useToast();

  useEffect(() => {
    let on = true;
    (async () => {
      try {
        const d = await api("/api/reminders");
        if (!on) return;
        setEnabled(d.reminder.enabled);
        setPushEnabled(d.reminder.pushEnabled);
        setTime(d.reminder.time);
        setVapidKey(d.vapidPublicKey);
      } catch {
        /* non-fatal */
      } finally {
        if (on) setLoading(false);
      }
    })();
    if (pushSupported()) setPerm(Notification.permission);
    return () => { on = false; };
  }, []);

  const persist = async (patch) => {
    setSaving(true);
    try {
      const d = await api("/api/reminders", {
        method: "PUT",
        body: {
          enabled,
          pushEnabled,
          time,
          tzOffset: new Date().getTimezoneOffset(),
          ...patch,
        },
      });
      setEnabled(d.reminder.enabled);
      setPushEnabled(d.reminder.pushEnabled);
      setTime(d.reminder.time);
      return true;
    } catch (err) {
      toast.err(err.message || "Couldn't save your reminder.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toggleReminder = async () => {
    const next = !enabled;
    setEnabled(next);
    const ok = await persist({ enabled: next });
    if (ok) toast.ok(next ? "Daily reminder on." : "Daily reminder off.");
  };

  const changeTime = async (v) => {
    setTime(v);
    await persist({ time: v });
  };

  const enablePush = async () => {
    if (!pushSupported()) {
      toast.err("This browser doesn't support notifications.");
      return;
    }
    if (isIOS() && !isStandalone()) {
      toast.info("On iPhone, add this app to your Home Screen first, then turn on notifications.");
      return;
    }
    if (!vapidKey) {
      toast.err("Push isn't configured on the server yet.");
      return;
    }

    setSaving(true);
    try {
      const permission = await Notification.requestPermission();
      setPerm(permission);
      if (permission !== "granted") {
        toast.err("Notifications were blocked. You can re-enable them in your browser settings.");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        });
      }

      await api("/api/reminders/subscribe", {
        method: "POST",
        body: { subscription: sub.toJSON() },
      });

      setPushEnabled(true);
      await persist({ pushEnabled: true, enabled: true });
      toast.ok("Push notifications enabled.");
    } catch (err) {
      console.error(err);
      toast.err("Couldn't enable notifications on this device.");
    } finally {
      setSaving(false);
    }
  };

  const disablePush = async () => {
    setSaving(true);
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        await api("/api/reminders/subscribe", {
          method: "DELETE",
          body: { endpoint: sub.endpoint },
        });
        await sub.unsubscribe();
      }
    } catch { /* ignore */ }
    setPushEnabled(false);
    await persist({ pushEnabled: false });
    setSaving(false);
    toast.ok("Push notifications turned off.");
  };

  if (loading) {
    return (
      <div className="card card-pad">
        <div className="sk" style={{ height: 18, width: 160, marginBottom: 14 }} />
        <div className="sk" style={{ height: 46 }} />
      </div>
    );
  }

  const blocked = perm === "denied";
  const iosNeedsInstall = isIOS() && !isStandalone();

  return (
    <div className="card card-pad">
      <h3 className="card-title flex gap8 mb16">
        <IconClock size={18} style={{ color: "var(--brand)" }} /> Daily reminder
      </h3>
      <p className="card-sub" style={{ lineHeight: 1.6 }}>
        A gentle nudge to write a few lines before the day slips away. We’ll skip
        it on days you’ve already journaled.
      </p>

      {/* master toggle */}
      <div
        className="mt16 flex between gap12"
        style={{
          background: "var(--surface-2)", borderRadius: 12,
          padding: "12px 14px", flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Remind me daily</div>
          <div className="muted" style={{ fontSize: 12.5 }}>
            Shows a nudge in the app when you visit.
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Toggle daily reminder"
          disabled={saving}
          onClick={toggleReminder}
          style={{
            width: 52, height: 30, borderRadius: 999, border: "none",
            padding: 3, flex: "0 0 auto",
            background: enabled ? "var(--brand)" : "var(--surface-3)",
            transition: "background .18s",
          }}
        >
          <span
            style={{
              display: "block", width: 24, height: 24, borderRadius: "50%",
              background: "var(--surface)", boxShadow: "0 1px 3px rgba(0,0,0,.35)",
              transform: enabled ? "translateX(22px)" : "translateX(0)",
              transition: "transform .18s",
            }}
          />
        </button>
      </div>

      {enabled && (
        <>
          {/* time picker */}
          <div className="field mt16" style={{ marginBottom: 0 }}>
            <label htmlFor="reminder-time">Remind me at</label>
            <input
              id="reminder-time"
              type="time"
              className="input"
              value={time}
              disabled={saving}
              onChange={(e) => changeTime(e.target.value)}
              style={{ maxWidth: 160 }}
            />
            <p className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
              Your local time.
            </p>
          </div>

          {/* push */}
          <div
            className="mt16"
            style={{
              border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px",
            }}
          >
            <div className="flex between gap12" style={{ flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>
                  Push notifications
                </div>
                <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                  {pushEnabled
                    ? "Reminders arrive even when the app is closed."
                    : "Get the nudge even when the app isn’t open."}
                </div>
              </div>
              {pushEnabled ? (
                <button
                  className="btn btn-ghost btn-sm"
                  disabled={saving}
                  onClick={disablePush}
                >
                  Turn off
                </button>
              ) : (
                <button
                  className="btn btn-soft btn-sm"
                  disabled={saving || blocked}
                  onClick={enablePush}
                >
                  Enable
                </button>
              )}
            </div>

            {pushEnabled && (
              <p
                className="flex gap6 mt8"
                style={{ fontSize: 12.5, color: "var(--good)", fontWeight: 600 }}
              >
                <IconCheck size={14} /> Active on this device
              </p>
            )}

            {blocked && (
              <p
                className="flex gap6 mt8"
                style={{ fontSize: 12.5, color: "var(--warn)", fontWeight: 600, lineHeight: 1.5 }}
              >
                <IconAlert size={14} />
                Notifications are blocked for this site — allow them in your
                browser settings to use push.
              </p>
            )}

            {!pushEnabled && !blocked && iosNeedsInstall && (
              <p
                className="muted mt8"
                style={{ fontSize: 12.5, lineHeight: 1.5 }}
              >
                On iPhone: tap Share → <strong>Add to Home Screen</strong>, open the
                app from there, then enable notifications.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
