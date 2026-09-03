"use client";

import { useEffect, useRef, useState } from "react";
import { useWorkTime } from "@/lib/scheduling/context";
import { Priority } from "@/lib/scheduling/types";
import { QuickInsertState } from "@/lib/scheduling/store";

// Remounted (via a `key` from the store) each time it's opened, so plain
// useState defaults below are enough — no reset effect needed.
export function QuickInsertPopover({ qi }: { qi: QuickInsertState }) {
  const store = useWorkTime();
  const popRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(1);
  const [priority, setPriority] = useState<Priority>("Medium");
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    titleRef.current?.focus();
    function onMouseDown(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        store.closeQuickInsert();
      }
    }
    const id = setTimeout(() => document.addEventListener("mousedown", onMouseDown, true), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onMouseDown, true);
    };
  }, [store]);

  const projectName = store.state.projects.find((p) => p.name === "General")?.name ?? store.state.projects[0]?.name;

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) {
      setInvalid(true);
      titleRef.current?.focus();
      return;
    }
    if (!projectName) {
      store.closeQuickInsert();
      return;
    }
    const dur = Math.max(0.5, duration || 1);
    store.createTaskAndInsert({ title: trimmed, project: projectName, description: "", priority, isFreeSlot: false, duration: dur, day: qi.day, position: qi.position });
    store.closeQuickInsert();
  }

  const popW = 280;
  const left = Math.min(window.innerWidth - popW - 16, Math.max(16, qi.anchor.left - 40));
  let top = qi.anchor.bottom + 8;
  if (top + 130 > window.innerHeight) top = Math.max(16, qi.anchor.top - 138);

  return (
    <div ref={popRef} className="quick-insert" style={{ left, top }}>
      <input
        ref={titleRef}
        type="text"
        placeholder="Task title…"
        value={title}
        style={invalid ? { borderColor: "var(--red)" } : undefined}
        onChange={(e) => {
          setTitle(e.target.value);
          if (invalid) setInvalid(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") store.closeQuickInsert();
        }}
      />
      <div className="quick-insert-row">
        <input type="number" min={0.5} step={0.5} value={duration} title="Duration (hours)" onChange={(e) => setDuration(parseFloat(e.target.value))} />
        <select value={priority} title="Priority" onChange={(e) => setPriority(e.target.value as Priority)}>
          <option>Medium</option>
          <option>High</option>
          <option>Low</option>
        </select>
      </div>
      <div className="quick-insert-foot">
        <button
          className="quick-insert-more"
          onClick={() => {
            const typed = title.trim();
            store.closeQuickInsert();
            store.openAddModal({ day: qi.day, position: qi.position, title: typed });
          }}
        >
          More options…
        </button>
        <div className="quick-insert-actions">
          <button className="btn secondary" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => store.closeQuickInsert()}>
            Cancel
          </button>
          <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={submit}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
