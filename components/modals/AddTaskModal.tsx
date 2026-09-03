"use client";

import { useState } from "react";
import { useWorkTime } from "@/lib/scheduling/context";
import { TODAY_DATE, TODAY_KEY, addDays, dkey, isWorkday, relDay, fmtShort } from "@/lib/scheduling/dates";
import { Priority } from "@/lib/scheduling/types";
import { AddTaskModalState } from "@/lib/scheduling/store";

// Remounted (via a `key` from the store) each time it's opened, so every field's
// initial value below only needs to be computed once per open — no reset effect.
export function AddTaskModal({ opts }: { opts: AddTaskModalState }) {
  const store = useWorkTime();
  const initialDay = opts.day || store.viewedKey;
  const hasPrefill = opts.title !== undefined;

  const [title, setTitle] = useState(hasPrefill ? opts.title! : "Proposal");
  const [project, setProject] = useState(hasPrefill ? "General" : "Sales");
  const [priority, setPriority] = useState<Priority>("High");
  const [description, setDescription] = useState(hasPrefill ? "" : "Draft the Q3 services proposal for a new account.");
  const [duration, setDuration] = useState(2);
  const [deadline, setDeadline] = useState(TODAY_KEY);
  const [day, setDay] = useState(initialDay);
  const [position, setPosition] = useState(() => {
    const blocksForDay = store.dayBlocks(initialDay);
    const preselect = opts.position;
    return preselect && (preselect === "end" || blocksForDay.some((b) => b.id === preselect)) ? preselect : "end";
  });

  const dayOptions: { value: string; label: string }[] = [];
  for (let off = -3; off <= 4; off++) {
    const dd = addDays(TODAY_DATE, off);
    if (!isWorkday(dd)) continue;
    const value = dkey(dd);
    dayOptions.push({ value, label: `${relDay(value)} — ${fmtShort(dd)}` });
  }

  const positionOptions = store.dayBlocks(day).map((b) => ({ value: b.id, label: `Insert before "${store.blockLabel(b)}"` }));

  function close() {
    store.closeAddModal();
  }

  function submit() {
    const trimmedTitle = title.trim() || "Untitled task";
    const dur = Math.max(0.5, duration || 1);
    close();
    store.createTaskAndInsert({
      title: trimmedTitle,
      project: project || "General",
      description: description.trim(),
      priority,
      duration: dur,
      deadline: deadline || TODAY_KEY,
      day,
      position,
    });
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal">
        <div className="modal-head">
          <h2>Add task</h2>
          <button className="modal-close" onClick={close}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Task title</label>
            <input type="text" value={title} placeholder="e.g. Client Proposal" onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Project</label>
              <select value={project} onChange={(e) => setProject(e.target.value)}>
                {store.state.projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Description (optional)</label>
            <textarea value={description} placeholder="What does this task involve?" onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Estimated duration (hours)</label>
              <input type="number" min={0.5} step={0.5} value={duration} onChange={(e) => setDuration(parseFloat(e.target.value))} />
            </div>
            <div className="field">
              <label>Deadline</label>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label>Schedule on</label>
            <select
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                setPosition("end");
              }}
            >
              {dayOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Place in timeline</label>
            <select value={position} onChange={(e) => setPosition(e.target.value)}>
              <option value="end">Add to end of the day</option>
              {positionOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn" onClick={submit}>
            Add to schedule
          </button>
        </div>
      </div>
    </div>
  );
}
