"use client";

import { useState } from "react";
import { useWorkTime } from "@/lib/scheduling/context";
import { Priority } from "@/lib/scheduling/types";
import { AdminTaskModalState } from "@/lib/scheduling/store";

// Remounted (via a `key` from the store) each time it's opened, so plain
// useState defaults below are enough — no reset effect needed.
export function AdminTaskModal({ opts }: { opts: AdminTaskModalState }) {
  const store = useWorkTime();
  const user = store.userById(opts.userId);
  const editingTask = opts.taskId ? store.taskById(opts.taskId) : undefined;
  const isEdit = !!editingTask;

  const projectNames = store.state.projects.map((p) => p.name);
  const defaultProject = editingTask?.project ?? projectNames[0] ?? "";

  const [title, setTitle] = useState(editingTask?.title ?? "");
  const [project, setProject] = useState(defaultProject);
  const [priority, setPriority] = useState<Priority>(editingTask?.priority ?? "High");
  const [description, setDescription] = useState(editingTask?.description ?? "");
  const [duration, setDuration] = useState(editingTask?.estimatedHours ?? 2);
  const [reassignTo, setReassignTo] = useState(editingTask?.userId ?? opts.userId);

  function close() {
    store.closeAdminTaskModal();
  }

  function submit() {
    const trimmedTitle = title.trim() || "Untitled task";
    const dur = Math.max(0.5, duration || 1);
    close();
    const input = { title: trimmedTitle, project, description: description.trim(), priority, estimatedHours: dur };
    if (isEdit && editingTask) {
      store.adminUpdateTask(editingTask.id, { ...input, reassignTo });
    } else {
      store.adminCreateTask(opts.userId, input);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && close()}>
      <div className="modal">
        <div className="modal-head">
          <h2>{isEdit ? "Edit task" : `Add task for ${user?.name.split(" ")[0] ?? "teammate"}`}</h2>
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
              {projectNames.length === 0 ? (
                <p className="field-hint">No projects yet — create one before assigning tasks.</p>
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
          <div className="field">
            <label>Description (optional)</label>
            <textarea value={description} placeholder="What does this task involve?" onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="field">
            <label>Estimated duration (hours)</label>
            <input type="number" min={0.5} step={0.5} value={duration} placeholder="e.g. 2" onChange={(e) => setDuration(parseFloat(e.target.value))} />
          </div>
          {isEdit && (
            <div className="field">
              <label>Reassign to</label>
              <select value={reassignTo} onChange={(e) => setReassignTo(e.target.value)}>
                {store.state.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn secondary" onClick={close}>
            Cancel
          </button>
          <button className="btn" onClick={submit} disabled={!project}>
            {isEdit ? "Save changes" : "Add task"}
          </button>
        </div>
      </div>
    </div>
  );
}
