"use client";

import { useWorkTime } from "@/lib/scheduling/context";
import { TODAY_KEY, addDays, dkey, fmtShort, keyToDate } from "@/lib/scheduling/dates";

interface TopbarAction {
  label: string;
  onClick: () => void;
}

export function Topbar({
  eyebrow,
  title,
  withDateStrip = false,
  action,
}: {
  eyebrow: string;
  title: string;
  withDateStrip?: boolean;
  /** Omit for the default "+ Add task" button, pass `null` to hide the action button entirely. */
  action?: TopbarAction | null;
}) {
  const store = useWorkTime();
  const d = keyToDate(store.viewedKey);
  const resolvedAction: TopbarAction | null =
    action === null ? null : action ?? { label: "+ Add task", onClick: () => store.openAddModal({ day: store.viewedKey }) };

  return (
    <div className="topbar">
      <div>
        <div className="view-eyebrow">{eyebrow}</div>
        <div className="view-title">{title}</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {withDateStrip && (
          <div className="date-strip">
            <button className="date-arrow" onClick={() => store.setViewedKey(dkey(addDays(d, -1)))}>
              ‹
            </button>
            {[-2, -1, 0, 1, 2].map((off) => {
              const dd = addDays(d, off);
              const k = dkey(dd);
              const isToday = k === TODAY_KEY;
              const isActive = off === 0;
              return (
                <button
                  key={k}
                  className={`date-pill${isToday ? " is-today" : ""}${isActive ? " is-active" : ""}`}
                  onClick={() => store.setViewedKey(k)}
                >
                  {fmtShort(dd)}
                </button>
              );
            })}
            <button className="date-arrow" onClick={() => store.setViewedKey(dkey(addDays(d, 1)))}>
              ›
            </button>
          </div>
        )}
        {resolvedAction && (
          <button className="btn" onClick={resolvedAction.onClick}>
            {resolvedAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
