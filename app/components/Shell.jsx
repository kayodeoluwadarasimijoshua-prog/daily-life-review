"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastProvider, useToast } from "./toast";
import Logo from "./Logo";
import { FeatherMark } from "./icons";
import {
  IconHome, IconJournal, IconSparkle, IconSettings,
  IconMenu, IconX, IconLogout,
} from "./icons";
import { api } from "../lib/client";

const NAV = [
  { href: "/", label: "Home", icon: IconHome },
  { href: "/journal", label: "Journal", icon: IconJournal },
  { href: "/insights", label: "Insights", icon: IconSparkle },
  { href: "/settings", label: "Settings", icon: IconSettings },
];

function SidebarContent({ pathname, onNavigate, user, onLogout, loggingOut }) {
  return (
    <>
      <div style={{ paddingLeft: 6 }}>
        <Logo />
      </div>
      <nav className="nav">
        <div className="nav-label">Menu</div>
        {NAV.map((n) => {
          const Icon = n.icon;
          const active = pathname === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={onNavigate}
              className={`nav-link ${active ? "active" : ""}`}
            >
              <Icon size={19} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <div className="userchip">
          <div className="avatar">
            {user ? user.name.trim().charAt(0).toUpperCase() : "U"}
          </div>
          <div className="grow" style={{ minWidth: 0 }}>
            <div className="nm">{user?.name}</div>
            <div className="em">{user?.email}</div>
          </div>
          <button
            className="icon-btn"
            style={{ width: 36, height: 36, border: "none", background: "transparent" }}
            onClick={onLogout}
            disabled={loggingOut}
            title="Log out"
          >
            <IconLogout size={18} />
          </button>
        </div>
      </div>
    </>
  );
}

export function Shell({ user, children }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    setLoggingOut(true);
    try {
      await api("/api/auth/logout", { method: "POST", body: {} });
    } catch (e) {
      /* ignore */
    }
    router.push("/login");
    router.refresh();
  };

  const close = () => setOpen(false);

  return (
    <ToastProvider>
      <div className="app-shell">
        {/* topbar mobile */}
        <div className="topbar">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <IconMenu size={20} />
          </button>
          <Logo small />
          <div style={{ marginLeft: "auto" }}>
            <span className="logo-mark sm" style={{ width: 34, height: 34, background: "var(--surface-3)", color: "var(--brand)" }}>
              <FeatherMark size={18} />
            </span>
          </div>
        </div>

        <div className={`sidebar-mask ${open ? "show" : ""}`} onClick={close} />
        <aside className={`sidebar ${open ? "open" : ""}`}>
          <SidebarContent
            pathname={pathname}
            onNavigate={close}
            user={user}
            onLogout={logout}
            loggingOut={loggingOut}
          />
        </aside>

        <main className="main">{children}</main>
      </div>
    </ToastProvider>
  );
}

export { useToast };
