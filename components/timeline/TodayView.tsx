"use client";

import { useState } from "react";
import { useWorkTime } from "@/lib/scheduling/context";
import { fmtClock, fmtLong, fmtShort, isWorkday, keyToDate, nextWorkday, t2m } from "@/lib/scheduling/dates";
import { Topbar } from "@/components/layout/Topbar";
import { BlockCard } from "./BlockCard";

const PX_PER_MIN = 1.05;

function greetingFor(date: Date) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function TodayView() {
  const store = useWorkTime();
  // Client's local time of day — read directly at render rather than via an
  // effect; the tiny server/client skew this can cause is harmless here.
  const greeting = greetingFor(new Date());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; before: boolean } | null>(null);

  const viewedKey = store.viewedKey;
  const d = keyToDate(viewedKey);
  const s = store.daySummary(viewedKey);
  const status = store.statusFor(s.scheduled, s.capacity);
  const remaining = Math.max(0, s.capacity - s.scheduled);

  const barDenom = Math.max(s.capacity, s.scheduled, 1);
  const fillPct = s.capacity > 0 ? (Math.min(s.scheduled, s.capacity) / barDenom) * 100 : 0;
  const overStartPct = s.scheduled > 0 ? (s.capacity / barDenom) * 100 : 0;

  const workStartM = t2m(store.state.settings.workStart);
  const workEndM = t2m(store.state.settings.workEnd);
  const totalMin = workEndM - workStartM;
  const heightPx = totalMin * PX_PER_MIN;

  const hourMarks: number[] = [];
  for (let m = workStartM; m <= workEndM; m += 60) hourMarks.push(m);
  const hourRows: number[] = [];
  for (let m = workStartM; m < workEndM; m += 60) hourRows.push(m);

  function handleDragStart(id: string) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      setDragId(id);
      e.dataTransfer.effectAllowed = "move";
    };
  }
  function handleDragOver(id: string) {
    return (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!dragId || dragId === id) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const before = e.clientY - rect.top < rect.height / 2;
      setDropTarget({ id, before });
    };
  }
  function handleDragEnd() {
    if (dragId && dropTarget && dropTarget.id !== dragId) {
      const ids = s.fitted.map((b) => b.id);
      const withoutDragged = ids.filter((id) => id !== dragId);
      const targetIdx = withoutDragged.indexOf(dropTarget.id);
      const insertAt = dropTarget.before ? targetIdx : targetIdx + 1;
      withoutDragged.splice(insertAt, 0, dragId);
      store.commitOrder(viewedKey, withoutDragged);
    }
    setDragId(null);
    setDropTarget(null);
  }

  function openQuickInsertAt(e: React.MouseEvent<HTMLButtonElement>, before: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    store.openQuickInsert({ day: viewedKey, position: before, anchor: { left: rect.left, top: rect.top, bottom: rect.bottom, right: rect.right } });
  }

  return (
    <>
      <Topbar eyebrow="Daily plan" title={fmtLong(d)} withDateStrip />

      <div className="panel gauge-panel">
        <span className="corner-tick tl"></span>
        <span className="corner-tick tr"></span>
        <span className="corner-tick bl"></span>
        <span className="corner-tick br"></span>
        <div className="gauge-top">
          <div className="gauge-greeting" suppressHydrationWarning>
            {greeting} — here&apos;s how {fmtShort(d)}&apos;s plan looks.
          </div>
          <div className={`gauge-status status-${status === "ok" ? "ok" : status === "tight" ? "tight" : "risk"}`}>
            <span className="dot"></span>
            {status === "ok" ? (s.overloaded > 0 ? "At capacity" : "On track") : status === "tight" ? "Tight schedule" : "Overloaded"}
          </div>
        </div>
        <div className="gauge-stats">
          <div>
            <div className="gauge-stat-label">WORKING CAPACITY</div>
            <div className="gauge-stat-value">{s.capacity}h</div>
          </div>
          <div>
            <div className="gauge-stat-label">SCHEDULED</div>
            <div className="gauge-stat-value">{s.scheduled}h</div>
          </div>
          <div>
            <div className="gauge-stat-label">{s.overloaded > 0 ? "OVERLOADED" : "REMAINING"}</div>
            <div className={`gauge-stat-value ${s.overloaded > 0 ? "red" : "green"}`}>{s.overloaded > 0 ? `+${s.overloaded}h ⚠` : `${remaining}h`}</div>
          </div>
        </div>
        <div className="gauge-bar-track">
          <div className="gauge-bar-fill" style={{ width: `${fillPct}%` }}></div>
          {s.overloaded > 0 && <div className="gauge-bar-over" style={{ left: `${overStartPct}%`, right: 0 }}></div>}
        </div>
      </div>

      <div className="timeline-wrap">
        <div style={{ flex: 1 }}>
          {!isWorkday(d) ? (
            <div className="timeline">
              <div className="weekend-note">
                No working hours scheduled — it&apos;s the weekend.
                <br />
                Use the arrows above to jump back to a working day.
              </div>
            </div>
          ) : (
            <div className="timeline" style={{ minHeight: heightPx + 20 }}>
              {hourMarks.map((m) => (
                <div key={`label-${m}`} className="hour-label" style={{ top: (m - workStartM) * PX_PER_MIN }}>
                  {fmtClock(m).replace(":00", "")}
                </div>
              ))}
              {hourRows.map((m) => (
                <div key={`row-${m}`} className="hour-row" style={{ height: 60 * PX_PER_MIN }}></div>
              ))}

              {s.fitted.map((b) => {
                const task = store.taskById(b.taskId)!;
                const top = (b.start! - workStartM) * PX_PER_MIN;
                const height = Math.max(38, (b.end! - b.start!) * PX_PER_MIN - 6);
                const cls = `${dragId === b.id ? "dragging" : ""} ${
                  dropTarget?.id === b.id ? (dropTarget.before ? "drop-before" : "drop-after") : ""
                }`.trim();
                return (
                  <BlockCard
                    key={b.id}
                    block={b}
                    task={task}
                    label={store.blockLabel(b)}
                    top={top}
                    height={height}
                    className={cls}
                    onOpen={() => store.openDetail(b.taskId)}
                    onMove={() => store.moveBlockToNextDay(b.id)}
                    onDragStart={handleDragStart(b.id)}
                    onDragOver={handleDragOver(b.id)}
                    onDragEnd={handleDragEnd}
                  />
                );
              })}

              {s.fitted.length === 0 ? (
                <div className="insert-gap" style={{ top: -9 }}>
                  <div className="insert-gap-line"></div>
                  <button className="insert-gap-btn" title="Insert a task here" onClick={(e) => openQuickInsertAt(e, "end")}>
                    + Add task here
                  </button>
                </div>
              ) : (
                <>
                  {s.fitted.map((b) => (
                    <div key={`gap-${b.id}`} className="insert-gap" style={{ top: (b.start! - workStartM) * PX_PER_MIN - 9 }}>
                      <div className="insert-gap-line"></div>
                      <button className="insert-gap-btn" title="Insert a task here" onClick={(e) => openQuickInsertAt(e, b.id)}>
                        + Add task here
                      </button>
                    </div>
                  ))}
                  <div
                    className="insert-gap"
                    style={{ top: (s.fitted[s.fitted.length - 1].end! - workStartM) * PX_PER_MIN - 9 }}
                  >
                    <div className="insert-gap-line"></div>
                    <button className="insert-gap-btn" title="Insert a task here" onClick={(e) => openQuickInsertAt(e, "end")}>
                      + Add task here
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {isWorkday(d) && s.overflow.length > 0 && (
        <div className="overflow-zone">
          <div className="overflow-zone-title">⚠ {s.overloaded}h overloaded — will move to the next available working day</div>
          {s.overflow.map((b) => (
            <div className="overflow-card" key={b.id}>
              <div className="overflow-card-main">
                <div className="overflow-card-title">
                  {store.blockLabel(b)} · {b.duration}h
                </div>
                <div className="overflow-card-note">Pushed to {fmtShort(nextWorkday(d))} — no capacity left today</div>
              </div>
              <button className="btn secondary" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => store.moveBlockToNextDay(b.id)}>
                Move now
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
