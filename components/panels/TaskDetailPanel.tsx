"use client";

import { useWorkTime } from "@/lib/scheduling/context";
import { fmtClock, fmtShort, keyToDate, relDay } from "@/lib/scheduling/dates";
import { UserAvatar } from "@/components/ui/UserAvatar";

export function TaskDetailPanel() {
  const store = useWorkTime();
  const taskId = store.ui.taskDetail;
  if (!taskId) return null;
  const task = store.taskById(taskId);
  if (!task) return null;

  const isMine = task.userId === store.state.currentUserId;
  const owner = store.userById(task.userId)!;
  const viewerIsAdmin = store.userById(store.state.currentUserId)?.isAdmin ?? false;
  const tblocks = store.state.blocks.filter((b) => b.taskId === taskId);
  const hist = store.historyForTask(taskId);

  function close() {
    store.closeDetail();
  }

  return (
    <>
      <div className="detail-overlay" onClick={close}></div>
      <div className="detail-panel">
        <div className="detail-head">
          <div className="detail-head-top">
            <div>
              <div className="detail-project">{task.project}</div>
              <div className="detail-title">{task.title}</div>
            </div>
            <button className="modal-close" onClick={close}>
              ✕
            </button>
          </div>
        </div>
        <div className="detail-body">
          {!isMine && (
            <div className="detail-section">
              <h4>ASSIGNED TO</h4>
              <div className="user-card-top">
                <UserAvatar name={owner.name} color={owner.color} />
                <div>
                  <div className="user-card-name">{owner.name}</div>
                  <div className="user-card-role">{owner.role}</div>
                </div>
              </div>
            </div>
          )}
          {task.description && (
            <div className="detail-section">
              <h4>DESCRIPTION</h4>
              <div className="detail-desc">{task.description}</div>
            </div>
          )}
          <div className="detail-section">
            <h4>DETAILS</h4>
            <div className="detail-row">
              <span className="detail-row-label">Estimated</span>
              <span>{task.estimatedHours}h</span>
            </div>
            <div className="detail-row">
              <span className="detail-row-label">Priority</span>
              <span>{task.priority}</span>
            </div>
          </div>
          <div className="detail-section">
            <h4>SCHEDULE</h4>
            {isMine ? (
              tblocks.length ? (
                tblocks.map((b) => (
                  <div className="detail-row" key={b.id}>
                    <span className="detail-row-label">
                      {relDay(b.day)} ({fmtShort(keyToDate(b.day))})
                    </span>
                    <span>{b.overflow ? "Overflow — pending move" : `${fmtClock(b.start!)} · ${b.duration}h`}</span>
                  </div>
                ))
              ) : (
                <div className="detail-row">
                  <span className="detail-row-label">No blocks scheduled yet</span>
                </div>
              )
            ) : (
              <div className="empty-hint" style={{ padding: 0 }}>
                Managed on {owner.name.split(" ")[0]}&apos;s own schedule.
              </div>
            )}
          </div>
          {isMine && (
            <div className="detail-section">
              <h4>SCHEDULE HISTORY</h4>
              {hist.length ? (
                hist.map((h) => (
                  <div className={`history-item${h.isMove ? " is-move" : ""}`} key={h.id}>
                    <div className="history-dot"></div>
                    <div>
                      <div className="history-text">{h.text}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-hint">No changes recorded yet for this task.</div>
              )}
            </div>
          )}
        </div>
        <div className="detail-foot">
          {isMine ? (
            <>
              <button className="btn secondary" onClick={() => store.openEditTaskModal(taskId)}>
                Edit task
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  store.deleteTask(taskId);
                  close();
                }}
              >
                Delete task
              </button>
            </>
          ) : viewerIsAdmin ? (
            <button className="btn secondary" onClick={() => store.openAdminTaskModal({ userId: task.userId, taskId: task.id })}>
              Edit task
            </button>
          ) : (
            <div className="empty-hint" style={{ padding: 0 }}>
              Read-only — {owner.name.split(" ")[0]} manages this task from their own account.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
