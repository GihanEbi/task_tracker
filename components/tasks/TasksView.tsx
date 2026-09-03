"use client";

import { useWorkTime } from "@/lib/scheduling/context";
import { relDay } from "@/lib/scheduling/dates";
import { Topbar } from "@/components/layout/Topbar";

export function TasksView() {
  const store = useWorkTime();
  const tasks = store
    .tasksForUser(store.state.currentUserId)
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <>
      <Topbar eyebrow="Your work" title="Tasks" />
      <div className="table-panel">
        <table className="tasks-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Project</th>
              <th>Duration</th>
              <th>Priority</th>
              <th>Schedule</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const tblocks = store.state.blocks.filter((b) => b.taskId === task.id);
              let schedule = "Unscheduled";
              if (tblocks.length) {
                const earliest = tblocks.slice().sort((a, b) => a.day.localeCompare(b.day))[0];
                schedule = relDay(earliest.day) + (tblocks.length > 1 ? ` +${tblocks.length - 1} more` : "");
              }
              return (
                <tr key={task.id} onClick={() => store.openDetail(task.id)}>
                  <td>
                    <div className="task-title-cell">{task.title}</div>
                    {task.description && <div className="task-desc-cell">{task.description}</div>}
                  </td>
                  <td>{task.project}</td>
                  <td>{task.estimatedHours}h</td>
                  <td>
                    <span className="badge b-neutral">{task.priority}</span>
                  </td>
                  <td>{schedule}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
