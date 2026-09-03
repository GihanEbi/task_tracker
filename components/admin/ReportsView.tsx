"use client";

import { useWorkTime } from "@/lib/scheduling/context";
import { Topbar } from "@/components/layout/Topbar";
import { UserAvatar } from "@/components/ui/UserAvatar";

export function ReportsView() {
  const store = useWorkTime();

  return (
    <>
      <Topbar eyebrow="Admin" title="Reports" action={null} />

      <div className="report-panel">
        <h3>Team</h3>
        {store.state.users.map((u) => {
          const tasks = store.tasksForUser(u.id);
          const totalEst = tasks.reduce((s, t) => s + t.estimatedHours, 0);
          return (
            <div className="report-row clickable" key={u.id} onClick={() => store.openUserDetail(u.id)}>
              <UserAvatar name={u.name} color={u.color} />
              <div className="report-row-main">
                <div className="report-row-title">{u.name}</div>
                <div className="report-row-sub">{u.role}</div>
              </div>
              <span className="badge b-neutral" style={{ minWidth: 100, justifyContent: "center" }}>
                {tasks.length} task{tasks.length === 1 ? "" : "s"} · {totalEst}h
              </span>
            </div>
          );
        })}
      </div>

      <div className="report-panel">
        <h3>Projects</h3>
        {store.state.projects.map((p) => {
          const stats = store.projectStats(p.name);
          return (
            <div className="report-row clickable" key={p.id} onClick={() => store.openProjectDetail(p.id)}>
              <span className="color-swatch" style={{ background: p.color, width: 14, height: 14 }}></span>
              <div className="report-row-main">
                <div className="report-row-title">{p.name}</div>
                <div className="report-row-sub">
                  {stats.count} task{stats.count === 1 ? "" : "s"} · {stats.totalEst}h
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
