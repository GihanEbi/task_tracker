"use client";

import { useWorkTime } from "@/lib/scheduling/context";
import { TODAY_KEY } from "@/lib/scheduling/dates";
import { Badge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/ui/UserAvatar";

export function UserDetailPanel() {
  const store = useWorkTime();
  const userId = store.ui.userDetail;
  if (!userId) return null;
  const user = store.userById(userId);
  if (!user) return null;

  const isOwnProfile = userId === store.state.currentUserId;
  const viewerIsAdmin = store.userById(store.state.currentUserId)?.isAdmin ?? false;

  const todaySum = isOwnProfile ? store.summaryForUserDay(TODAY_KEY) : null;
  const todayStatus = todaySum ? store.statusFor(todaySum.scheduled, todaySum.capacity) : "ok";
  const todayItems = isOwnProfile ? store.scheduleItemsForUserDay(TODAY_KEY) : [];
  const userTasks = store.tasksForUser(userId);
  const userProjects = Array.from(new Set(userTasks.map((t) => t.project)));

  // Teammates have no persisted per-day schedule, so "today" is derived from
  // task order + daily capacity (see engine.todayBucketForUser) rather than
  // read from real schedule_blocks like the self view above.
  const derivedToday = !isOwnProfile ? store.todayBucketForUser(userId) : null;
  const derivedTodayIds = new Set(derivedToday?.tasks.map((t) => t.id));
  const derivedStatus = derivedToday ? store.statusFor(derivedToday.scheduled, derivedToday.capacity) : "ok";
  const orderedUserTasks = isOwnProfile ? userTasks : [...userTasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  function close() {
    store.closeUserDetail();
  }

  return (
    <>
      <div className="detail-overlay" onClick={close}></div>
      <div className="detail-panel">
        <div className="detail-head">
          <div className="detail-head-top">
            <div className="user-card-top">
              <UserAvatar name={user.name} color={user.color} size={40} />
              <div>
                <div className="detail-title" style={{ fontSize: 17 }}>
                  {user.name}
                  {isOwnProfile ? " · You" : ""}
                </div>
                <div className="user-card-role">
                  {user.role} · {user.department}
                  {user.isAdmin ? " · Admin" : ""}
                </div>
              </div>
            </div>
            <button className="modal-close" onClick={close}>
              ✕
            </button>
          </div>
          {isOwnProfile && todaySum && (
            <Badge tone={todayStatus}>{todayStatus === "ok" ? "On track today" : todayStatus === "tight" ? "Tight today" : "Overloaded today"}</Badge>
          )}
          {derivedToday && (
            <Badge tone={derivedStatus}>
              {derivedStatus === "ok" ? "On track today (est.)" : derivedStatus === "tight" ? "Tight today (est.)" : "Overloaded today (est.)"}
            </Badge>
          )}
        </div>
        <div className="detail-body">
          {isOwnProfile && todaySum ? (
            <>
              <div className="detail-section">
                <h4>TODAY</h4>
                <div className="detail-stats">
                  <div>
                    <div className="detail-stat-label">Capacity</div>
                    <div className="detail-stat-value">{todaySum.capacity}h</div>
                  </div>
                  <div>
                    <div className="detail-stat-label">Scheduled</div>
                    <div className="detail-stat-value">{todaySum.scheduled}h</div>
                  </div>
                  <div>
                    <div className="detail-stat-label">{todaySum.overloaded > 0 ? "Overloaded" : "Remaining"}</div>
                    <div className={`detail-stat-value ${todaySum.overloaded > 0 ? "red" : "green"}`}>
                      {todaySum.overloaded > 0 ? `+${todaySum.overloaded}h` : `${Math.max(0, todaySum.capacity - todaySum.scheduled)}h`}
                    </div>
                  </div>
                </div>
              </div>
              <div className="detail-section">
                <h4>TODAY&apos;S AGENDA</h4>
                {todayItems.length ? (
                  todayItems.map((it, i) => (
                    <div className="report-row" key={i}>
                      <div className="report-row-main">
                        <div className="report-row-title">{it.title}</div>
                        <div className="report-row-sub">
                          {it.project} · {it.duration}h{it.overflow ? " · pending move" : ""}
                        </div>
                      </div>
                      <span className="badge b-neutral">{it.priority}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-hint">Nothing scheduled today.</div>
                )}
              </div>
            </>
          ) : (
            <>
              {derivedToday && (
                <div className="detail-section">
                  <h4>TODAY</h4>
                  <div className="detail-stats">
                    <div>
                      <div className="detail-stat-label">Capacity</div>
                      <div className="detail-stat-value">{derivedToday.capacity}h</div>
                    </div>
                    <div>
                      <div className="detail-stat-label">Scheduled</div>
                      <div className="detail-stat-value">{derivedToday.scheduled}h</div>
                    </div>
                    <div>
                      <div className="detail-stat-label">{derivedToday.overloaded > 0 ? "Overloaded" : "Remaining"}</div>
                      <div className={`detail-stat-value ${derivedToday.overloaded > 0 ? "red" : "green"}`}>
                        {derivedToday.overloaded > 0 ? `+${derivedToday.overloaded}h` : `${Math.max(0, derivedToday.capacity - derivedToday.scheduled)}h`}
                      </div>
                    </div>
                  </div>
                  <div className="empty-hint">
                    An estimate from task order and {user.name.split(" ")[0]}&apos;s daily capacity — their real schedule is placed automatically but isn&apos;t visible from here.
                  </div>
                </div>
              )}
              <div className="detail-section">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <h4 style={{ margin: 0 }}>TASKS</h4>
                  {viewerIsAdmin && (
                    <button className="btn ghost" style={{ padding: "4px 8px", fontSize: 11.5 }} onClick={() => store.openAdminTaskModal({ userId })}>
                      + Add task
                    </button>
                  )}
                </div>
                {orderedUserTasks.length ? (
                  orderedUserTasks.map((t) => (
                    <div className="report-row" key={t.id}>
                      <div className="report-row-main">
                        <div className="report-row-title">
                          {t.title}
                          {derivedTodayIds.has(t.id) ? " · Today" : ""}
                        </div>
                        <div className="report-row-sub">
                          {t.project} · {t.estimatedHours}h
                        </div>
                      </div>
                      <span className="badge b-neutral">{t.priority}</span>
                      {viewerIsAdmin && (
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn ghost" style={{ padding: "4px 8px", fontSize: 11.5 }} onClick={() => store.openAdminTaskModal({ userId, taskId: t.id })}>
                            Edit
                          </button>
                          <button
                            className="btn ghost"
                            style={{ padding: "4px 8px", fontSize: 11.5, color: "var(--red)" }}
                            onClick={() => store.adminDeleteTask(t.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="empty-hint">No tasks yet.</div>
                )}
              </div>
            </>
          )}
          <div className="detail-section">
            <h4>CONTACT</h4>
            <div className="detail-row">
              <span className="detail-row-label">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Projects</span>
              <span>{userProjects.join(", ") || "—"}</span>
            </div>
          </div>
        </div>
        <div className="detail-foot" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
          <div className="empty-hint" style={{ padding: 0 }}>
            {isOwnProfile
              ? "This is your own schedule — edit it from Today."
              : viewerIsAdmin
                ? `You're managing ${user.name.split(" ")[0]}'s tasks as an admin.`
                : `Read-only — ${user.name.split(" ")[0]} manages their own tasks.`}
          </div>
          {viewerIsAdmin && !isOwnProfile && (
            <button className={`btn ${user.isAdmin ? "danger" : "secondary"}`} onClick={() => store.setUserAdmin(userId, !user.isAdmin)}>
              {user.isAdmin ? "Remove admin" : "Make admin"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
