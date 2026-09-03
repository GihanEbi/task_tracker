"use client";

import { useWorkTime } from "@/lib/scheduling/context";
import { addDays, fmtShort, fmtWeekdayLong, dkey, TODAY_DATE, TODAY_KEY } from "@/lib/scheduling/dates";
import { Topbar } from "@/components/layout/Topbar";

const OFFSETS = [-3, -2, -1, 0, 1];

export function OverviewView() {
  const store = useWorkTime();

  return (
    <>
      <Topbar eyebrow="This week" title="Workload overview" />
      <div className="week-chart">
        {OFFSETS.map((off) => {
          const dd = addDays(TODAY_DATE, off);
          const key = dkey(dd);
          const s = store.daySummary(key);
          const status = store.statusFor(s.scheduled, s.capacity);
          const color = status === "ok" ? "var(--green)" : status === "tight" ? "var(--amber)" : "var(--red)";
          const badgeTone = status;
          const badgeText = status === "ok" ? "On track" : status === "tight" ? "Tight" : "At risk";
          const pct = Math.min(100, (s.scheduled / Math.max(s.capacity, s.scheduled, 1)) * 100);
          return (
            <div className="week-chart-row" key={key}>
              <div className="week-chart-day">
                <div className="week-chart-day-name">
                  {fmtWeekdayLong(dd)}
                  {key === TODAY_KEY ? " · Today" : ""}
                </div>
                <div className="week-chart-day-date">{fmtShort(dd)}</div>
              </div>
              <div className="week-chart-track">
                <div className="week-chart-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
              <div className="week-chart-num">
                {s.scheduled}h / {s.capacity}h
              </div>
              <div className="week-chart-badge">
                <span className={`badge b-${badgeTone}`}>{badgeText}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="empty-hint">Numbers update live as tasks are added, moved or removed on the Today view.</div>
    </>
  );
}
