"use client";

import { useRouter } from "next/navigation";
import { useWorkTime } from "@/lib/scheduling/context";
import { addDays, dkey, fmtShort, fmtWeekday, TODAY_DATE, TODAY_KEY } from "@/lib/scheduling/dates";
import { Topbar } from "@/components/layout/Topbar";

const OFFSETS = [-3, -2, -1, 0, 1];

export function CalendarView() {
  const store = useWorkTime();
  const router = useRouter();

  return (
    <>
      <Topbar eyebrow="Navigate" title="Calendar" />
      <div className="day-grid">
        {OFFSETS.map((off) => {
          const dd = addDays(TODAY_DATE, off);
          const key = dkey(dd);
          const s = store.daySummary(key);
          const status = store.statusFor(s.scheduled, s.capacity);
          const pct = s.capacity > 0 ? Math.min(100, (s.scheduled / Math.max(s.capacity, s.scheduled || 1)) * 100) : 0;
          return (
            <button
              key={key}
              className={`day-card${key === TODAY_KEY ? " is-today" : ""}`}
              onClick={() => {
                store.setViewedKey(key);
                router.push("/today");
              }}
            >
              <div className="day-card-top">
                <div>
                  <div className="day-card-weekday">
                    {fmtWeekday(dd).toUpperCase()}
                    {key === TODAY_KEY ? " · TODAY" : ""}
                  </div>
                  <div className="day-card-date">{fmtShort(dd)}</div>
                </div>
              </div>
              <div className="day-card-hours" style={{ color: status === "ok" ? "var(--ink)" : status === "tight" ? "var(--amber)" : "var(--red)" }}>
                {s.scheduled}h
              </div>
              <div className="day-card-bar">
                <div
                  className="day-card-bar-fill"
                  style={{ width: `${pct}%`, background: status === "ok" ? "var(--blue)" : status === "tight" ? "var(--amber)" : "var(--red)" }}
                />
              </div>
              <div className="day-card-count">
                {s.list.length} block{s.list.length === 1 ? "" : "s"} · cap {s.capacity}h
              </div>
            </button>
          );
        })}
      </div>
      <div className="empty-hint">Tap a day to open its plan on the Today view.</div>
    </>
  );
}
