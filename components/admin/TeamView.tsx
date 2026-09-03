"use client";

import { useWorkTime } from "@/lib/scheduling/context";
import { TODAY_KEY } from "@/lib/scheduling/dates";
import { Topbar } from "@/components/layout/Topbar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function TeamView() {
  const store = useWorkTime();

  return (
    <>
      <Topbar eyebrow="Admin" title="Team" action={{ label: "+ Add user", onClick: () => store.openAddUserModal() }} />
      <div className="people-grid">
        {store.state.users.map((u) => {
          const s = store.summaryForUserDay(u.id, TODAY_KEY);
          const status = store.statusFor(s.scheduled, s.capacity);
          const pct = s.capacity > 0 ? Math.min(100, (s.scheduled / Math.max(s.capacity, s.scheduled, 1)) * 100) : 0;
          const badgeText = status === "ok" ? "On track" : status === "tight" ? "Tight" : "Overloaded";
          const barColor = status === "ok" ? "var(--blue)" : status === "tight" ? "var(--amber)" : "var(--red)";
          return (
            <button className="user-card" key={u.id} onClick={() => store.openUserDetail(u.id)}>
              <div className="user-card-top">
                <UserAvatar name={u.name} color={u.color} />
                <div>
                  <div className="user-card-name">
                    {u.name}
                    {u.id === store.state.currentUserId ? " · You" : ""}
                  </div>
                  <div className="user-card-role">{u.role}</div>
                </div>
              </div>
              <div className="user-card-stats">
                <div className="user-card-hours">
                  {s.scheduled}h <span style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 400 }}>/ {s.capacity}h today</span>
                </div>
                <span className={`badge b-${status}`}>{badgeText}</span>
              </div>
              <ProgressBar pct={pct} color={barColor} />
            </button>
          );
        })}
      </div>
    </>
  );
}
