export type Priority = "High" | "Medium" | "Low";
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
  isAdmin: boolean;
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
  priority: Priority;
  userId: string;
  createdAt: string; // ISO timestamp
  createdBy: string; // user id
  updatedAt: string; // ISO timestamp
  updatedBy: string; // user id
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
  overflow: boolean;
  taskId: string;
}

export interface ProjectStats {
  list: Task[];
  count: number;
  totalEst: number;
  userIds: string[];
}
