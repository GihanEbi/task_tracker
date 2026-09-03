"use client";

import { useWorkTime } from "@/lib/scheduling/context";
import { fmtShort, fmtWeekday, keyToDate, TODAY_KEY, weekKeys } from "@/lib/scheduling/dates";
import { Topbar } from "@/components/layout/Topbar";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function ReportsView() {
  const store = useWorkTime();

  const atRisk = store.state.tasks
    .filter((t) => t.status !== "Completed" && t.project !== "Personal")
    .map((t) => ({ t, dstat: store.computeDeadlineStatus(t) }))
    .filter((x) => x.dstat.level === "tight" || x.dstat.level === "risk")
    .sort((a, b) => {
      if (a.dstat.level !== b.dstat.level) return a.dstat.level === "risk" ? -1 : 1;
      return keyToDate(a.t.deadline).getTime() - keyToDate(b.t.deadline).getTime();
    });

  return (
    <>
      <Topbar eyebrow="Admin" title="Reports" action={null} />

      <div className="report-panel">
        <h3>Team workload — today</h3>
        {store.state.users.map((u) => {
          const s = store.summaryForUserDay(u.id, TODAY_KEY);
          const status = store.statusFor(s.scheduled, s.capacity);
          return (
            <div className="report-row clickable" key={u.id} onClick={() => store.openUserDetail(u.id)}>
              <UserAvatar name={u.name} color={u.color} />
              <div className="report-row-main">
                <div className="report-row-title">{u.name}</div>
                <div className="report-row-sub">{u.role}</div>
              </div>
              <div className="week-dots" title="Mon–Fri status">
                {weekKeys().map((k) => {
                  const ds = store.summaryForUserDay(u.id, k);
                  const dst = store.statusFor(ds.scheduled, ds.capacity);
                  return (
                    <span
                      key={k}
                      className={`week-dot wd-${dst}`}
                      title={`${fmtWeekday(keyToDate(k))}: ${ds.scheduled}h / ${ds.capacity}h`}
                    ></span>
                  );
                })}
              </div>
              <span className={`badge b-${status}`} style={{ minWidth: 82, justifyContent: "center" }}>
                {s.scheduled}h / {s.capacity}h
              </span>
            </div>
          );
        })}
      </div>

      <div className="report-panel">
        <h3>Project progress</h3>
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
              <div style={{ width: 130 }}>
                <ProgressBar pct={stats.pct} color={p.color} />
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-soft)", width: 34, textAlign: "right" }}>{stats.pct}%</span>
            </div>
          );
        })}
      </div>

      <div className="report-panel">
        <h3>At risk this week</h3>
        {atRisk.length ? (
          atRisk.map(({ t, dstat }) => {
            const owner = store.userById(t.userId)!;
            return (
              <div className="report-row clickable" key={t.id} onClick={() => store.openDetail(t.id)}>
                <UserAvatar name={owner.name} color={owner.color} size={26} />
                <div className="report-row-main">
                  <div className="report-row-title">{t.title}</div>
                  <div className="report-row-sub">
                    {owner.name} · {t.project} · due {fmtShort(keyToDate(t.deadline))}
                  </div>
                </div>
                <span className={`badge b-${dstat.level === "tight" ? "tight" : "risk"}`}>{dstat.label}</span>
              </div>
            );
          })
        ) : (
          <div className="risk-list-empty">Nothing at risk right now — the whole team is on track.</div>
        )}
      </div>
    </>
  );
}
