"use client";

import { useWorkTime } from "@/lib/scheduling/context";
import { Topbar } from "@/components/layout/Topbar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { UserAvatar } from "@/components/ui/UserAvatar";

export function ProjectsView() {
  const store = useWorkTime();

  return (
    <>
      <Topbar eyebrow="Admin" title="Projects" action={{ label: "+ Add project", onClick: () => store.openAddProjectModal() }} />
      <div className="project-grid">
        {store.state.projects.map((p) => {
          const stats = store.projectStats(p.name);
          return (
            <button className="project-card" key={p.id} onClick={() => store.openProjectDetail(p.id)}>
              <div className="project-card-bar" style={{ background: p.color }}></div>
              <div className="project-card-body">
                <div className="project-card-name">{p.name}</div>
                <div className="project-card-desc">{p.description || ""}</div>
                <ProgressBar pct={stats.pct} color={p.color} />
                <div className="project-card-meta">
                  <span>
                    {stats.count} task{stats.count === 1 ? "" : "s"} · {stats.totalEst}h
                  </span>
                  <span>{stats.pct}%</span>
                </div>
                <div className="avatar-stack">
                  {stats.userIds.map((uid) => {
                    const u = store.userById(uid);
                    return u ? <UserAvatar key={uid} name={u.name} color={u.color} /> : null;
                  })}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
