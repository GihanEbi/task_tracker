"use client";

import { useState } from "react";
import { useWorkTime } from "@/lib/scheduling/context";
import { Priority } from "@/lib/scheduling/types";
import { EditTaskModalState } from "@/lib/scheduling/store";

// Remounted (via a `key` from the store) each time it's opened, so plain
// useState defaults below are enough — no reset effect needed.
export function EditTaskModal({ opts }: { opts: EditTaskModalState }) {
  const store = useWorkTime();
  const task = store.taskById(opts.taskId);

  const projectNames = store.state.projects.map((p) => p.name);

  const [title, setTitle] = useState(task?.title ?? "");
  const [project, setProject] = useState(task?.project || projectNames[0] || "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? "High");
  const [description, setDescription] = useState(task?.description ?? "");
  const [duration, setDuration] = useState(task?.estimatedHours ?? 1);
  const [isFreeSlot, setIsFreeSlot] = useState(task?.isFreeSlot ?? false);

  function close() {
    store.closeEditTaskModal();
  }

  function submit() {
    if (!task) return close();
    const trimmedTitle = title.trim() || "Untitled task";
    const dur = Math.max(0.5, duration || 1);
    close();
    store.updateTask(task.id, {
      title: trimmedTitle,
      project: isFreeSlot ? undefined : project,
      description: description.trim(),
      priority: isFreeSlot ? undefined : priority,
      isFreeSlot,
      duration: dur,
    });
  }

  if (!task) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal">
        <div className="modal-head">
          <h2>Edit task</h2>
          <button className="modal-close" onClick={close}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Task title</label>
            <input
              type="text"
              value={title}
              placeholder={isFreeSlot ? "e.g. Lunch Break" : "e.g. Client Proposal"}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <label className="toggle-row">
            <span className="toggle-switch">
              <input type="checkbox" checked={isFreeSlot} onChange={(e) => setIsFreeSlot(e.target.checked)} />
              <span className="toggle-track"></span>
            </span>
            Free time slot
          </label>
          {!isFreeSlot && (
            <div className="field-row">
              <div className="field">
                <label>Project</label>
                {projectNames.length === 0 ? (
                  <p className="field-hint">No projects yet — ask an admin to create one before scheduling tasks.</p>
                ) : (
                  <select value={project} onChange={(e) => setProject(e.target.value)}>
                    {store.state.projects.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
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
          )}
          <div className="field">
            <label>Description (optional)</label>
            <textarea value={description} placeholder="What does this task involve?" onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label>Estimated duration (hours)</label>
            <input type="number" min={0.5} step={0.5} value={duration} placeholder="e.g. 2" onChange={(e) => setDuration(parseFloat(e.target.value))} />
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn" onClick={submit} disabled={!isFreeSlot && !project}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
