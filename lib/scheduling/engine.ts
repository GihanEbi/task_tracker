import {
  DaySummary,
  DeadlineStatus,
  Project,
  ProjectStats,
  ScheduleBlock,
  ScheduleItem,
  Task,
  User,
  WorkloadStatus,
  WorkloadSummary,
  WorkTimeState,
} from "./types";
import { addDays, fmtShort, isWorkday, keyToDate, t2m, TODAY_DATE } from "./dates";

export function deriveWorkEnd(settings: WorkTimeState["settings"]) {
  const endM = t2m(settings.workStart) + settings.capacity * 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  settings.workEnd = `${pad(Math.floor(endM / 60) % 24)}:${pad(endM % 60)}`;
}

export function dayBlocks(state: WorkTimeState, key: string): ScheduleBlock[] {
  return state.blocks.filter((b) => b.day === key).sort((a, b) => a.order - b.order);
}

export function allDayKeys(state: WorkTimeState): string[] {
  return Array.from(new Set(state.blocks.map((b) => b.day))).sort();
}

export function recalcDay(state: WorkTimeState, key: string) {
  const list = dayBlocks(state, key);
  const workEnd = t2m(state.settings.workEnd);
  let pointer = t2m(state.settings.workStart);
  const workday = isWorkday(keyToDate(key));
  list.forEach((b) => {
    if (!workday) {
      b.overflow = true;
      b.start = null;
      b.end = null;
      return;
    }
    const end = pointer + b.duration * 60;
    if (end > workEnd) {
      b.overflow = true;
      b.start = null;
      b.end = null;
    } else {
      b.overflow = false;
      b.start = pointer;
      b.end = end;
      pointer = end;
    }
  });
}

export function recalcAll(
  state: WorkTimeState,
  logChanges: boolean,
  pushHistory: (block: ScheduleBlock, text: string, isMove: boolean) => void
) {
  const before: Record<string, boolean> = {};
  if (logChanges) state.blocks.forEach((b) => (before[b.id] = b.overflow));
  allDayKeys(state).forEach((key) => recalcDay(state, key));
  if (logChanges) {
    state.blocks.forEach((b) => {
      if (before[b.id] === false && b.overflow === true) {
        const dest = fmtShort(nextWorkdayOf(b.day));
        pushHistory(b, `Pushed from ${fmtShort(keyToDate(b.day))} — moved beyond today's capacity, next available day is ${dest}.`, true);
      } else if (before[b.id] === true && b.overflow === false) {
        pushHistory(b, `Fits back into ${fmtShort(keyToDate(b.day))} after the schedule change.`, false);
      }
    });
  }
}

function nextWorkdayOf(dayKey: string) {
  let r = addDays(keyToDate(dayKey), 1);
  while (!isWorkday(r)) r = addDays(r, 1);
  return r;
}

export function daySummary(state: WorkTimeState, key: string): DaySummary {
  const list = dayBlocks(state, key);
  const scheduled = list.reduce((s, b) => s + b.duration, 0);
  const capacity = isWorkday(keyToDate(key)) ? state.settings.capacity : 0;
  const overloaded = Math.max(0, scheduled - capacity);
  return {
    key,
    list,
    scheduled,
    capacity,
    overloaded,
    fitted: list.filter((b) => !b.overflow),
    overflow: list.filter((b) => b.overflow),
  };
}

export function statusFor(scheduled: number, capacity: number): WorkloadStatus {
  const over = scheduled - capacity;
  if (capacity <= 0) return "ok";
  if (over <= 0) return "ok";
  if (over <= 1) return "tight";
  return "risk";
}

export function taskById(state: WorkTimeState, id: string): Task | undefined {
  return state.tasks.find((t) => t.id === id);
}

export function userById(state: WorkTimeState, id: string): User | undefined {
  return state.users.find((u) => u.id === id);
}

export function blockLabel(state: WorkTimeState, block: ScheduleBlock): string {
  return block.label || taskById(state, block.taskId)?.title || "";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function computeDeadlineStatus(state: WorkTimeState, task: Task): DeadlineStatus {
  const remaining = Math.max(0, task.estimatedHours - task.completedHours);
  if (remaining <= 0) return { level: "ok", label: "Complete", detail: "All estimated hours are logged for this task." };
  const deadlineDate = keyToDate(task.deadline);
  const isMine = task.userId === state.currentUserId;
  const cap = isMine ? state.settings.capacity : (userById(state, task.userId)?.capacity ?? 8);
  let cursor = new Date(Math.min(TODAY_DATE.getTime(), deadlineDate.getTime()));
  let available = 0;
  let guard = 0;
  while (cursor <= deadlineDate && guard < 60) {
    if (isWorkday(cursor)) {
      const key = dkeyLocal(cursor);
      const others = isMine
        ? state.blocks.filter((b) => b.day === key && b.taskId !== task.id).reduce((s, b) => s + b.duration, 0)
        : state.tasks
            .filter((t) => t.userId === task.userId && t.assignedDay === key && t.id !== task.id)
            .reduce((s, t) => s + t.estimatedHours, 0);
      available += Math.max(0, cap - others);
    }
    cursor = addDays(cursor, 1);
    guard++;
  }
  const spare = available - remaining;
  if (spare >= 2) return { level: "ok", label: "On Track", detail: `The current schedule can complete this task before ${fmtShort(deadlineDate)}.` };
  if (spare >= 0) return { level: "tight", label: "Tight Schedule", detail: `Only ${spare.toFixed(1)}h of spare capacity remains before ${fmtShort(deadlineDate)}.` };
  return { level: "risk", label: "At Risk", detail: `This task needs ${remaining}h, but only ${available}h are available before ${fmtShort(deadlineDate)}.` };
}

function dkeyLocal(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function summaryForUserDay(state: WorkTimeState, userId: string, dayKey: string): WorkloadSummary {
  if (userId === state.currentUserId) {
    const s = daySummary(state, dayKey);
    return { key: s.key, scheduled: s.scheduled, capacity: s.capacity, overloaded: s.overloaded };
  }
  const user = userById(state, userId);
  const list = state.tasks.filter((t) => t.userId === userId && t.assignedDay === dayKey);
  const scheduled = list.reduce((s, t) => s + t.estimatedHours, 0);
  const capacity = isWorkday(keyToDate(dayKey)) ? user?.capacity ?? 0 : 0;
  const overloaded = Math.max(0, scheduled - capacity);
  return { key: dayKey, scheduled, capacity, overloaded };
}

export function scheduleItemsForUserDay(state: WorkTimeState, userId: string, dayKey: string): ScheduleItem[] {
  if (userId === state.currentUserId) {
    return daySummary(state, dayKey).list.map((b) => {
      const t = taskById(state, b.taskId)!;
      return { title: blockLabel(state, b), project: t.project, duration: b.duration, priority: t.priority, status: t.status, overflow: b.overflow, taskId: t.id };
    });
  }
  return state.tasks
    .filter((t) => t.userId === userId && t.assignedDay === dayKey)
    .map((t) => ({ title: t.title, project: t.project, duration: t.estimatedHours, priority: t.priority, status: t.status, overflow: false, taskId: t.id }));
}

export function tasksForUser(state: WorkTimeState, userId: string): Task[] {
  return state.tasks.filter((t) => t.userId === userId);
}

export function projectStats(state: WorkTimeState, projectName: string): ProjectStats {
  const list = state.tasks.filter((t) => t.project === projectName);
  const totalEst = list.reduce((s, t) => s + t.estimatedHours, 0);
  const totalDone = list.reduce((s, t) => s + Math.min(t.completedHours, t.estimatedHours), 0);
  const pct = totalEst > 0 ? Math.round((totalDone / totalEst) * 100) : 0;
  const userIds = Array.from(new Set(list.map((t) => t.userId)));
  return { list, count: list.length, totalEst, totalDone, pct, userIds };
}

export function projectByName(state: WorkTimeState, name: string): Project | undefined {
  return state.projects.find((p) => p.name === name);
}
