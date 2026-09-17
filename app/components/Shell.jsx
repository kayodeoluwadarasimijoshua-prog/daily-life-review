"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastProvider } from "./toast";
import Logo from "./Logo";
import { FeatherMark } from "./icons";
import {
  IconHome, IconJournal, IconSparkle, IconSettings,
  IconMenu, IconLogout, IconPlus,
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

function BottomTab({ pathname }) {
  return (
    <nav className="bottom-tab">
      {NAV.map((n) => {
        const Icon = n.icon;
        const active = pathname === n.href;
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`tab-item ${active ? "active" : ""}`}
          >
            <Icon size={20} />
            <span>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// Page title map for mobile topbar
const PAGE_TITLES = {
  "/": "Home",
  "/journal": "Journal",
  "/insights": "Insights",
  "/settings": "Settings",
};

export function Shell({ user, children }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (open) document.body.classList.add("modal-open");
    else document.body.classList.remove("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  const logout = async () => {
    setLoggingOut(true);
    try { await api("/api/auth/logout", { method: "POST", body: {} }); } catch (e) {}
    router.push("/login");
    router.refresh();
  };

  const close = () => setOpen(false);

  return (
    <ToastProvider>
      <div className="app-shell">
        {/* ── Desktop sidebar ── */}
        <div className={`sidebar-mask ${open ? "show" : ""}`} onClick={close} aria-hidden={!open} />
        <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Navigation">
          <SidebarContent pathname={pathname} onNavigate={close} user={user} onLogout={logout} loggingOut={loggingOut} />
        </aside>

        {/* ── Mobile topbar ── */}
        <div className="topbar">
          <button className="topbar-menu" onClick={() => setOpen(true)} aria-label="Open menu">
            <IconMenu size={20} />
          </button>
          <span className="topbar-title">{PAGE_TITLES[pathname] || ""}</span>
          <div className="topbar-avatar">
            {user ? user.name.trim().charAt(0).toUpperCase() : "U"}
          </div>
        </div>

        {/* ── Main content ── */}
        <main className="main">
          <div className="content">{children}</div>
        </main>

        {/* ── Mobile bottom tab ── */}
        <BottomTab pathname={pathname} />

        {/* ── Mobile FAB ── */}
        {pathname !== "/journal" && (
          <Link href="/journal?new=1" className="fab" aria-label="New entry">
            <IconPlus size={24} />
          </Link>
        )}
      </div>
    </ToastProvider>
  );
}

export { useToast } from "./toast";
