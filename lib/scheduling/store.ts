import * as engine from "./engine";
import * as actions from "./actions";
import { dkey, fmtShort, keyToDate, nextWorkday, relDay, TODAY_KEY } from "./dates";
import { DaySummary, DeadlineStatus, HistoryEntry, Priority, ProjectStats, ScheduleBlock, ScheduleItem, Task, User, WorkloadSummary, WorkTimeState } from "./types";

export interface ToastItem {
  id: string;
  msg: string;
  warn: boolean;
}

export interface AddTaskModalState {
  day?: string;
  position?: string;
  title?: string;
}

export interface QuickInsertState {
  day: string;
  position: string;
  anchor: { left: number; top: number; bottom: number; right: number };
}

export interface UIState {
  addTask: AddTaskModalState | null;
  addTaskKey: number;
  addUser: boolean;
  addUserKey: number;
  addProject: boolean;
  addProjectKey: number;
  quickInsert: QuickInsertState | null;
  quickInsertKey: number;
  taskDetail: string | null;
  userDetail: string | null;
  projectDetail: string | null;
}

export interface CreateTaskInput {
  title: string;
  project: string;
  description: string;
  priority: Priority;
  duration: number;
  deadline: string;
  day: string;
  position: string; // block id, or "end"
}

let toastSeq = 1;

export class WorkTimeStore {
  state: WorkTimeState;
  viewedKey: string = TODAY_KEY;
  ui: UIState = {
    addTask: null,
    addTaskKey: 0,
    addUser: false,
    addUserKey: 0,
    addProject: false,
    addProjectKey: 0,
    quickInsert: null,
    quickInsertKey: 0,
    taskDetail: null,
    userDetail: null,
    projectDetail: null,
  };
  toasts: ToastItem[] = [];

  private uiSeq = 0;
  private listeners = new Set<() => void>();
  private version = 0;

  constructor(initialState: WorkTimeState) {
    this.state = initialState;
    engine.deriveWorkEnd(this.state.settings);
  }

  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  getSnapshot = () => this.version;

  private notify() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  private pushHistory(block: ScheduleBlock, text: string, isMove: boolean) {
    const entry: HistoryEntry = { id: crypto.randomUUID(), blockId: block.id, taskId: block.taskId, ts: Date.now(), text, isMove };
    this.state.history.unshift(entry);
  }

  recalcAll(logChanges: boolean) {
    engine.recalcAll(this.state, logChanges, (b, t, m) => this.pushHistory(b, t, m));
  }

  // Applies a synchronous optimistic mutation immediately, fires the matching
  // Server Action in the background, and rolls the whole state back with an
  // error toast if the server rejects it (never silently loses the schedule).
  private runOptimistic(mutate: () => void, persist: Promise<unknown>, errorMsg: string) {
    const snapshot = structuredClone(this.state);
    mutate();
    this.notify();
    persist.catch((err) => {
      console.error(err);
      this.state = snapshot;
      this.recalcAll(false);
      this.addToast(errorMsg, true);
      this.notify();
    });
  }

  // ---------------- derived reads ----------------

  daySummary(key: string): DaySummary {
    return engine.daySummary(this.state, key);
  }
  dayBlocks(key: string): ScheduleBlock[] {
    return engine.dayBlocks(this.state, key);
  }
  taskById(id: string): Task | undefined {
    return engine.taskById(this.state, id);
  }
  userById(id: string): User | undefined {
    return engine.userById(this.state, id);
  }
  blockLabel(block: ScheduleBlock): string {
    return engine.blockLabel(this.state, block);
  }
  computeDeadlineStatus(task: Task): DeadlineStatus {
    return engine.computeDeadlineStatus(this.state, task);
  }
  summaryForUserDay(userId: string, dayKey: string): WorkloadSummary {
    return engine.summaryForUserDay(this.state, userId, dayKey);
  }
  scheduleItemsForUserDay(userId: string, dayKey: string): ScheduleItem[] {
    return engine.scheduleItemsForUserDay(this.state, userId, dayKey);
  }
  tasksForUser(userId: string): Task[] {
    return engine.tasksForUser(this.state, userId);
  }
  projectStats(projectName: string): ProjectStats {
    return engine.projectStats(this.state, projectName);
  }
  historyForTask(taskId: string): HistoryEntry[] {
    return this.state.history.filter((h) => h.taskId === taskId);
  }
  statusFor(scheduled: number, capacity: number) {
    return engine.statusFor(scheduled, capacity);
  }

  // ---------------- navigation state ----------------

  setViewedKey(key: string) {
    this.viewedKey = key;
    this.notify();
  }

  // ---------------- toasts ----------------

  addToast(msg: string, warn = false) {
    const id = "toast" + toastSeq++;
    this.toasts.push({ id, msg, warn });
    this.notify();
    setTimeout(() => this.removeToast(id), 3200);
  }
  removeToast(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }

  // ---------------- task/schedule actions ----------------

  createTaskAndInsert(input: CreateTaskInput) {
    const taskId = crypto.randomUUID();
    const blockId = crypto.randomUUID();

    this.runOptimistic(
      () => {
        this.state.tasks.push({
          id: taskId,
          title: input.title,
          project: input.project,
          description: input.description,
          estimatedHours: input.duration,
          completedHours: 0,
          deadline: input.deadline,
          priority: input.priority,
          status: "Planned",
          userId: this.state.currentUserId,
        });

        let order: number;
        if (input.position === "end" || !input.position) {
          const maxOrder = Math.max(-1, ...this.state.blocks.filter((b) => b.day === input.day).map((b) => b.order));
          order = maxOrder + 1;
        } else {
          const beforeBlock = this.state.blocks.find((b) => b.id === input.position);
          const maxOrder = Math.max(-1, ...this.state.blocks.filter((b) => b.day === input.day).map((b) => b.order));
          order = beforeBlock ? beforeBlock.order - 0.5 : maxOrder + 1;
        }
        this.state.blocks.push({ id: blockId, taskId, day: input.day, order, duration: input.duration, overflow: false, start: null, end: null });
        engine.dayBlocks(this.state, input.day).forEach((b, idx) => (b.order = idx));

        this.recalcAll(true);
        this.viewedKey = input.day;
        const summary = engine.daySummary(this.state, input.day);
        const wasOverloaded = summary.overloaded > 0;
        this.addToast(
          wasOverloaded ? `"${input.title}" added — ${relDay(input.day).toLowerCase()} is now ${summary.overloaded}h over capacity.` : `"${input.title}" added to ${relDay(input.day)}.`,
          wasOverloaded
        );
      },
      actions.createTaskAction({ taskId, blockId, ...input }),
      `Unable to create "${input.title}". Please try again — your previous schedule has been restored.`
    );
  }

  moveBlockToNextDay(blockId: string) {
    const b = this.state.blocks.find((x) => x.id === blockId);
    if (!b) return;
    const label = this.blockLabel(b);

    this.runOptimistic(
      () => {
        const block = this.state.blocks.find((x) => x.id === blockId)!;
        const dest = dkey(nextWorkday(keyToDate(block.day)));
        const maxOrder = Math.max(-1, ...this.state.blocks.filter((x) => x.day === dest).map((x) => x.order));
        block.day = dest;
        block.order = maxOrder + 1;
        this.recalcAll(false);
        this.pushHistory(block, `Manually moved to ${fmtShort(keyToDate(dest))}.`, true);
        this.addToast(`Moved "${label}" to ${fmtShort(keyToDate(dest))}`);
      },
      actions.moveBlockToNextDayAction(blockId),
      `Unable to move this task. Please try again.`
    );
  }

  commitOrder(day: string, orderedBlockIds: string[]) {
    this.runOptimistic(
      () => {
        orderedBlockIds.forEach((id, idx) => {
          const b = this.state.blocks.find((x) => x.id === id);
          if (b) b.order = idx;
        });
        this.recalcAll(true);
      },
      actions.commitOrderAction(day, orderedBlockIds),
      `Unable to reorder the schedule. Please try again.`
    );
  }

  markComplete(taskId: string) {
    const task = this.taskById(taskId);
    if (!task) return;

    this.runOptimistic(
      () => {
        task.completedHours = task.estimatedHours;
        task.status = "Completed";
        this.addToast(`"${task.title}" marked complete.`);
      },
      actions.markCompleteAction(taskId),
      `Unable to mark "${task.title}" complete. Please try again.`
    );
  }

  deleteTask(taskId: string) {
    const task = this.taskById(taskId);
    if (!task) return;
    const title = task.title;

    this.runOptimistic(
      () => {
        for (let i = this.state.blocks.length - 1; i >= 0; i--) {
          if (this.state.blocks[i].taskId === taskId) this.state.blocks.splice(i, 1);
        }
        const idx = this.state.tasks.findIndex((t) => t.id === taskId);
        if (idx > -1) this.state.tasks.splice(idx, 1);
        this.recalcAll(true);
        this.addToast(`"${title}" deleted — schedule recalculated.`);
      },
      actions.deleteTaskAction(taskId),
      `Unable to delete "${title}". Please try again — your previous schedule has been restored.`
    );
  }

  // ---------------- settings ----------------

  saveSettings(next: { workStart: string; capacity: number; defaultSlot: number }) {
    this.runOptimistic(
      () => {
        this.state.settings.workStart = next.workStart || this.state.settings.workStart;
        this.state.settings.capacity = next.capacity || this.state.settings.capacity;
        this.state.settings.defaultSlot = next.defaultSlot || this.state.settings.defaultSlot;
        engine.deriveWorkEnd(this.state.settings);
        this.recalcAll(true);
        this.addToast("Settings saved — your schedule was recalculated.");
      },
      actions.saveSettingsAction(next),
      `Schedule recalculation failed. Your previous settings have been preserved.`
    );
  }

  resetSettings() {
    this.runOptimistic(
      () => {
        this.state.settings.workStart = "09:00";
        this.state.settings.capacity = 8;
        this.state.settings.defaultSlot = 60;
        engine.deriveWorkEnd(this.state.settings);
        this.recalcAll(true);
        this.addToast("Settings reset to defaults.");
      },
      actions.resetSettingsAction(),
      `Unable to reset settings. Please try again.`
    );
  }

  // ---------------- admin: users/projects ----------------

  addUser(input: { name: string; role: string; department: string; email: string; capacity: number }) {
    const id = crypto.randomUUID();
    const palette = ["#2D5A8C", "#7C4A9E", "#1F7A6C", "#8C5A2B", "#4A6B8C", "#3D7A5C"];
    const color = palette[this.state.users.length % palette.length];

    this.runOptimistic(
      () => {
        this.state.users.push({ id, name: input.name, role: input.role, department: input.department, email: input.email, capacity: input.capacity, color });
        this.addToast(`"${input.name}" added to the team.`);
      },
      actions.addUserAction({ id, ...input }),
      `Unable to add "${input.name}". Only admins can add team members.`
    );
  }

  addProject(input: { name: string; description: string; color: string }): boolean {
    if (this.state.projects.some((p) => p.name.toLowerCase() === input.name.toLowerCase())) {
      this.addToast(`A project named "${input.name}" already exists.`, true);
      return false;
    }
    const id = crypto.randomUUID();

    this.runOptimistic(
      () => {
        this.state.projects.push({ id, name: input.name, color: input.color, description: input.description });
        this.addToast(`"${input.name}" project created — it's now selectable when adding tasks.`);
      },
      actions.addProjectAction({ id, ...input }),
      `Unable to add "${input.name}". Only admins can add projects.`
    );
    return true;
  }

  // ---------------- ui: modals / panels ----------------

  openAddModal(opts: AddTaskModalState = {}) {
    this.ui.addTask = opts;
    this.ui.addTaskKey = ++this.uiSeq;
    this.notify();
  }
  closeAddModal() {
    this.ui.addTask = null;
    this.notify();
  }
  openQuickInsert(state: QuickInsertState) {
    this.ui.quickInsert = state;
    this.ui.quickInsertKey = ++this.uiSeq;
    this.notify();
  }
  closeQuickInsert() {
    this.ui.quickInsert = null;
    this.notify();
  }
  openDetail(taskId: string | null) {
    this.ui.taskDetail = taskId;
    this.notify();
  }
  closeDetail() {
    this.ui.taskDetail = null;
    this.notify();
  }
  openUserDetail(userId: string) {
    this.ui.userDetail = userId;
    this.notify();
  }
  closeUserDetail() {
    this.ui.userDetail = null;
    this.notify();
  }
  openProjectDetail(projectId: string) {
    this.ui.projectDetail = projectId;
    this.notify();
  }
  closeProjectDetail() {
    this.ui.projectDetail = null;
    this.notify();
  }
  openAddUserModal() {
    this.ui.addUser = true;
    this.ui.addUserKey = ++this.uiSeq;
    this.notify();
  }
  closeAddUserModal() {
    this.ui.addUser = false;
    this.notify();
  }
  openAddProjectModal() {
    this.ui.addProject = true;
    this.ui.addProjectKey = ++this.uiSeq;
    this.notify();
  }
  closeAddProjectModal() {
    this.ui.addProject = false;
    this.notify();
  }
}
