"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { useWorkTime } from "@/lib/scheduling/context";
import { TODAY_KEY } from "@/lib/scheduling/dates";

const NAV_ITEMS = [
  {
    view: "today",
    href: "/today",
    label: "Today",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 5v3l2 1.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    view: "calendar",
    href: "/calendar",
    label: "Calendar",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2.5" y="3.5" width="11" height="10" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    view: "tasks",
    href: "/tasks",
    label: "Tasks",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 4.5h10M3 8h10M3 11.5h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    view: "overview",
    href: "/overview",
    label: "Overview",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3.5 12.5v-6M8 12.5v-9M12.5 12.5v-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    view: "settings",
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
        <path
          d="M8 2.7v1.4M8 11.9v1.4M13.3 8h-1.4M4.1 8H2.7M11.5 4.5l-1 1M5.5 10.5l-1 1M11.5 11.5l-1-1M5.5 5.5l-1-1"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
];

const ADMIN_NAV_ITEMS = [
  {
    view: "team",
    href: "/admin/team",
    label: "Team",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5.5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2 13c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="11.5" cy="5.8" r="1.7" stroke="currentColor" strokeWidth="1.3" />
        <path d="M9.8 9.8c1.6.2 2.9 1.3 2.9 3.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    view: "projects",
    href: "/admin/projects",
    label: "Projects",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2.5" y="4" width="11" height="8.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2.5 6.5h11" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.5 4V2.8h5V4" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    view: "reports",
    href: "/admin/reports",
    label: "Reports",
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 2.5v11h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5.3 10.5l2-3 2 1.6 2.7-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const store = useWorkTime();
  const s = store.daySummary(TODAY_KEY);
  const pct = s.capacity > 0 ? Math.min(100, Math.round((s.scheduled / s.capacity) * 100)) : 0;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark"></div>
        <div>
          <div className="brand-name">WorkTime</div>
          <div className="brand-tag">schedule&nbsp;engine</div>
        </div>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <Link key={item.view} href={item.href} className={`nav-item${pathname === item.href ? " active" : ""}`}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
        <div className="nav-divider">Admin</div>
        {ADMIN_NAV_ITEMS.map((item) => (
          <Link key={item.view} href={item.href} className={`nav-item${pathname === item.href ? " active" : ""}`}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar-foot">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <Show when="signed-out">
            <SignInButton />
            <SignUpButton />
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
        <div className="mini-gauge-label">
          <span>Today</span>
          <span>
            {s.scheduled}h / {s.capacity}h
          </span>
        </div>
        <div className="mini-gauge">
          <div className="mini-gauge-fill" style={{ width: `${pct}%`, background: s.overloaded > 0 ? "var(--red)" : "var(--blue)" }} />
        </div>
      </div>
    </aside>
  );
}
