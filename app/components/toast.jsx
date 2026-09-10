"use client";
import React, { createContext, useCallback, useContext, useState } from "react";
import { IconAlert, IconCheck, IconInfo } from "./icons";

const ToastCtx = createContext(null);

export function useToast() {
  return useContext(ToastCtx);
}

let id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((type, message) => {
    const tid = ++id;
    setToasts((t) => [...t, { id: tid, type, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== tid));
    }, 4200);
  }, []);

  const ok = useCallback((m) => push("ok", m), [push]);
  const err = useCallback((m) => push("err", m), [push]);
  const info = useCallback((m) => push("info", m), [push]);

  const value = { ok, err, info };

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="flex" style={{ marginTop: 1 }}>
              {t.type === "ok" && <IconCheck size={16} />}
              {t.type === "err" && <IconAlert size={16} />}
              {t.type === "info" && <IconInfo size={16} />}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
