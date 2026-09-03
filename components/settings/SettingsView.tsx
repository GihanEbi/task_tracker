"use client";

import { useState } from "react";
import { useWorkTime } from "@/lib/scheduling/context";
import { Topbar } from "@/components/layout/Topbar";

export function SettingsView() {
  const store = useWorkTime();
  const settings = store.state.settings;
  const [workStart, setWorkStart] = useState(settings.workStart);
  const [capacity, setCapacity] = useState(settings.capacity);
  const [defaultSlot, setDefaultSlot] = useState(settings.defaultSlot);

  return (
    <>
      <Topbar eyebrow="Configure" title="Settings" action={null} />
      <div className="settings-grid">
        <div className="field-group">
          <h3>Working hours</h3>
          <div className="field-row">
            <div className="field">
              <label>Start</label>
              <input type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} />
            </div>
            <div className="field">
              <label>End (calculated)</label>
              <input type="text" value={settings.workEnd} disabled style={{ color: "var(--ink-faint)", background: "var(--paper-2)" }} />
            </div>
          </div>
          <div className="empty-hint" style={{ paddingTop: 2 }}>
            End time isn&apos;t set directly — it&apos;s start time + capacity, calculated automatically. Lunch and other breaks aren&apos;t reserved
            separately — add them the same way as any other task, and they&apos;ll take up their own slot on the timeline.
          </div>
        </div>
        <div className="field-group">
          <h3>Capacity &amp; defaults</h3>
          <div className="field">
            <label>Daily working capacity (hours)</label>
            <input type="number" min={1} max={16} step={0.5} value={capacity} onChange={(e) => setCapacity(parseFloat(e.target.value))} />
          </div>
          <div className="field">
            <label>Default time slot duration</label>
            <select value={defaultSlot} onChange={(e) => setDefaultSlot(parseInt(e.target.value, 10))}>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
        </div>
        <div className="settings-actions">
          <button
            className="btn secondary"
            onClick={() => {
              store.resetSettings();
              setWorkStart(store.state.settings.workStart);
              setCapacity(store.state.settings.capacity);
              setDefaultSlot(store.state.settings.defaultSlot);
            }}
          >
            Reset to defaults
          </button>
          <button
            className="btn"
            onClick={() => {
              store.saveSettings({ workStart, capacity, defaultSlot });
            }}
          >
            Save &amp; recalculate
          </button>
        </div>
      </div>
    </>
  );
}
