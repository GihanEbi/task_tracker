export type Priority = "High" | "Medium" | "Low";
export type TaskStatus = "Planned" | "In Progress" | "Completed";
export type DeadlineLevel = "ok" | "tight" | "risk";
export type WorkloadStatus = "ok" | "tight" | "risk";

export interface Settings {
  workStart: string; // "HH:MM"
  workEnd: string; // "HH:MM" — derived, never set directly
  capacity: number; // hours/day, for the current user
  defaultSlot: number; // minutes
}

export interface User {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  capacity: number; // hours/day
  color: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  description: string;
}

export interface Task {
  id: string;
  title: string;
  project: string; // project name
  description: string;
  estimatedHours: number;
  completedHours: number;
  deadline: string; // day key
  priority: Priority;
  status: TaskStatus;
  userId: string;
  assignedDay?: string; // day key — teammate tasks only (no draggable blocks)
}

export interface ScheduleBlock {
  id: string;
  taskId: string;
  day: string; // day key
  order: number;
  duration: number; // hours
  overflow: boolean;
  start: number | null; // minutes from midnight
  end: number | null;
  label?: string;
}

export interface HistoryEntry {
  id: string;
  blockId: string;
  taskId: string;
  ts: number;
  text: string;
  isMove: boolean;
}

export interface WorkTimeState {
  settings: Settings;
  users: User[];
  projects: Project[];
  tasks: Task[];
  blocks: ScheduleBlock[];
  history: HistoryEntry[];
  currentUserId: string;
}

export interface DaySummary {
  key: string;
  list: ScheduleBlock[];
  scheduled: number;
  capacity: number;
  overloaded: number;
  fitted: ScheduleBlock[];
  overflow: ScheduleBlock[];
}

export interface WorkloadSummary {
  key: string;
  scheduled: number;
  capacity: number;
  overloaded: number;
}

export interface ScheduleItem {
  title: string;
  project: string;
  duration: number;
  priority: Priority;
  status: TaskStatus;
  overflow: boolean;
  taskId: string;
}

export interface DeadlineStatus {
  level: DeadlineLevel;
  label: string;
  detail: string;
}

export interface ProjectStats {
  list: Task[];
  count: number;
  totalEst: number;
  totalDone: number;
  pct: number;
  userIds: string[];
}
