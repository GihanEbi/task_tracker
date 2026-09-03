import {
  DaySummary,
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
import { addDays, dkey, fmtShort, isWorkday, keyToDate, t2m } from "./dates";

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

// Only meaningful for the signed-in user — teammates' schedule_blocks are
// never loaded client-side, so there's no per-day data to summarize for them.
export function summaryForUserDay(state: WorkTimeState, dayKey: string): WorkloadSummary {
  const s = daySummary(state, dayKey);
  return { key: s.key, scheduled: s.scheduled, capacity: s.capacity, overloaded: s.overloaded };
}

export function scheduleItemsForUserDay(state: WorkTimeState, dayKey: string): ScheduleItem[] {
  return daySummary(state, dayKey).list.map((b) => {
    const t = taskById(state, b.taskId)!;
    return { title: blockLabel(state, b), project: t.project, duration: b.duration, priority: t.priority, isFreeSlot: t.isFreeSlot, overflow: b.overflow, taskId: t.id };
  });
}

export function tasksForUser(state: WorkTimeState, userId: string): Task[] {
  return state.tasks.filter((t) => t.userId === userId);
}

export function projectStats(state: WorkTimeState, projectName: string): ProjectStats {
  const list = state.tasks.filter((t) => t.project === projectName);
  const totalEst = list.reduce((s, t) => s + t.estimatedHours, 0);
  const userIds = Array.from(new Set(list.map((t) => t.userId)));
  return { list, count: list.length, totalEst, userIds };
}

export function projectByName(state: WorkTimeState, name: string): Project | undefined {
  return state.projects.find((p) => p.name === name);
}

export interface DerivedDayBucket {
  key: string;
  tasks: Task[];
  scheduled: number;
  capacity: number;
  overloaded: number;
}

// Teammates have no persisted per-day schedule (only the signed-in user's own
// tasks have real schedule_blocks). To show a "today" view for them anyway,
// greedily pack their tasks — oldest created first — into consecutive
// working days against their daily capacity, mirroring how the real
// timeline overflows work into the next working day when capacity runs out.
export function deriveDailyBuckets(tasks: Task[], capacity: number, startKey: string): DerivedDayBucket[] {
  const ordered = [...tasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const buckets: DerivedDayBucket[] = [];
  let cursor = keyToDate(startKey);
  while (!isWorkday(cursor)) cursor = addDays(cursor, 1);
  let bucket: DerivedDayBucket = { key: dkey(cursor), tasks: [], scheduled: 0, capacity, overloaded: 0 };

  for (const task of ordered) {
    if (bucket.tasks.length > 0 && bucket.scheduled + task.estimatedHours > capacity) {
      bucket.overloaded = Math.max(0, bucket.scheduled - capacity);
      buckets.push(bucket);
      do {
        cursor = addDays(cursor, 1);
      } while (!isWorkday(cursor));
      bucket = { key: dkey(cursor), tasks: [], scheduled: 0, capacity, overloaded: 0 };
    }
    bucket.tasks.push(task);
    bucket.scheduled += task.estimatedHours;
  }
  bucket.overloaded = Math.max(0, bucket.scheduled - capacity);
  buckets.push(bucket);
  return buckets;
}

export function todayBucketForUser(state: WorkTimeState, userId: string, todayKey: string): DerivedDayBucket {
  const capacity = userById(state, userId)?.capacity ?? 0;
  const [first] = deriveDailyBuckets(tasksForUser(state, userId), capacity, todayKey);
  if (first.key === todayKey) return first;
  return { key: todayKey, tasks: [], scheduled: 0, capacity: isWorkday(keyToDate(todayKey)) ? capacity : 0, overloaded: 0 };
}
