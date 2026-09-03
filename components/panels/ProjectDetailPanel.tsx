"use client";

import { useWorkTime } from "@/lib/scheduling/context";
import { UserAvatar } from "@/components/ui/UserAvatar";

export function ProjectDetailPanel() {
  const store = useWorkTime();
  const projectId = store.ui.projectDetail;
  if (!projectId) return null;
  const p = store.state.projects.find((x) => x.id === projectId);
  if (!p) return null;
  const stats = store.projectStats(p.name);

  function close() {
    store.closeProjectDetail();
  }

  return (
    <>
      <div className="detail-overlay" onClick={close}></div>
      <div className="detail-panel">
        <div className="detail-head">
          <div className="detail-head-top">
            <div>
              <div className="detail-project" style={{ color: p.color }}>
                PROJECT
              </div>
              <div className="detail-title">{p.name}</div>
            </div>
            <button className="modal-close" onClick={close}>
              ✕
            </button>
          </div>
        </div>
        <div className="detail-body">
          {p.description && (
            <div className="detail-section">
              <h4>DESCRIPTION</h4>
              <div className="detail-desc">{p.description}</div>
            </div>
          )}
          <div className="detail-section">
            <h4>PROGRESS</h4>
            <div className="detail-stats">
              <div>
                <div className="detail-stat-label">Tasks</div>
                <div className="detail-stat-value">{stats.count}</div>
              </div>
              <div>
                <div className="detail-stat-label">Estimated</div>
                <div className="detail-stat-value">{stats.totalEst}h</div>
              </div>
            </div>
          </div>
          <div className="detail-section">
            <h4>TEAM</h4>
            <div className="avatar-stack">
              {stats.userIds.length ? (
                stats.userIds.map((uid) => {
                  const u = store.userById(uid);
                  return u ? <UserAvatar key={uid} name={u.name} color={u.color} /> : null;
                })
              ) : (
                <span className="empty-hint" style={{ padding: 0 }}>
                  No one assigned yet.
                </span>
              )}
            </div>
          </div>
          <div className="detail-section">
            <h4>TASKS</h4>
            {stats.list.length ? (
              stats.list
                .slice()
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((t) => {
                  const owner = store.userById(t.userId)!;
                  return (
                    <div className="report-row" key={t.id}>
                      <UserAvatar name={owner.name} color={owner.color} size={26} />
                      <div className="report-row-main">
                        <div className="report-row-title">{t.title}</div>
                        <div className="report-row-sub">
                          {owner.name} · {t.estimatedHours}h
                        </div>
                      </div>
                      <span className="badge b-neutral">{t.priority}</span>
                    </div>
                  );
                })
            ) : (
              <div className="empty-hint">No tasks in this project yet.</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
