"use client";

import { useWorkTime } from "@/lib/scheduling/context";
import { fmtWeekdayLong, keyToDate, TODAY_KEY, weekKeys } from "@/lib/scheduling/dates";
import { Badge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/ui/UserAvatar";

export function UserDetailPanel() {
  const store = useWorkTime();
  const userId = store.ui.userDetail;
  if (!userId) return null;
  const user = store.userById(userId);
  if (!user) return null;

  const todaySum = store.summaryForUserDay(userId, TODAY_KEY);
  const todayStatus = store.statusFor(todaySum.scheduled, todaySum.capacity);
  const todayItems = store.scheduleItemsForUserDay(userId, TODAY_KEY);
  const userProjects = Array.from(new Set(store.tasksForUser(userId).map((t) => t.project)));

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
                  {userId === store.state.currentUserId ? " · You" : ""}
                </div>
                <div className="user-card-role">
                  {user.role} · {user.department}
                </div>
              </div>
            </div>
            <button className="modal-close" onClick={close}>
              ✕
            </button>
          </div>
          <Badge tone={todayStatus}>{todayStatus === "ok" ? "On track today" : todayStatus === "tight" ? "Tight today" : "Overloaded today"}</Badge>
        </div>
        <div className="detail-body">
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
                  <span className="badge b-neutral">{it.status}</span>
                </div>
              ))
            ) : (
              <div className="empty-hint">Nothing scheduled today.</div>
            )}
          </div>
          <div className="detail-section">
            <h4>THIS WEEK</h4>
            {weekKeys().map((k) => {
              const s = store.summaryForUserDay(userId, k);
              const st = store.statusFor(s.scheduled, s.capacity);
              return (
                <div className="detail-row" key={k}>
                  <span className="detail-row-label">
                    {fmtWeekdayLong(keyToDate(k))}
                    {k === TODAY_KEY ? " · Today" : ""}
                  </span>
                  <Badge tone={st}>
                    {s.scheduled}h / {s.capacity}h
                  </Badge>
                </div>
              );
            })}
          </div>
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
        <div className="detail-foot">
          <div className="empty-hint" style={{ padding: 0 }}>
            {userId === store.state.currentUserId ? "This is your own schedule — edit it from Today." : `Read-only — ${user.name.split(" ")[0]} manages their own schedule.`}
          </div>
        </div>
      </div>
    </>
  );
}
