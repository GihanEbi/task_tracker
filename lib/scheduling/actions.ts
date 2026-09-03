"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getOrCreateAppUser } from "./current-user";
import { USER_COLOR_PALETTE } from "./palette";
import * as engine from "./engine";
import { dkey, fmtShort, isWorkday, keyToDate, nextWorkday, TODAY_KEY } from "./dates";
import { HistoryEntry, Priority, Project, ScheduleBlock, Task, User, WorkTimeState } from "./types";

type SupabaseAdmin = ReturnType<typeof createSupabaseAdminClient>;

// ---------------- row -> app-model mapping ----------------

interface UserRow {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  capacity: number | string;
  color: string;
  is_admin: boolean;
}
interface ProjectRow {
  id: string;
  name: string;
  color: string;
  description: string;
}
interface TaskRow {
  id: string;
  title: string;
  description: string;
  estimated_hours: number | string;
  priority: string | null;
  is_free_slot: boolean;
  user_id: string;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  projects: { name: string } | null;
}
interface BlockRow {
  id: string;
  task_id: string;
  day: string;
  order: number | string;
  duration: number | string;
  overflow: boolean;
  start_minutes: number | null;
  end_minutes: number | null;
  label: string | null;
}
interface HistoryRow {
  id: string;
  block_id: string | null;
  task_id: string;
  ts: string;
  text: string;
  is_move: boolean;
}
interface OrderRow {
  id: string;
  order: number | string;
}

function mapUserRow(r: UserRow): User {
  return { id: r.id, name: r.name, role: r.role, department: r.department, email: r.email, capacity: Number(r.capacity), color: r.color, isAdmin: r.is_admin };
}
function mapProjectRow(r: ProjectRow): Project {
  return { id: r.id, name: r.name, color: r.color, description: r.description };
}
function mapTaskRow(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    project: r.projects?.name ?? "",
    description: r.description,
    estimatedHours: Number(r.estimated_hours),
    priority: (r.priority as Priority | null) ?? null,
    isFreeSlot: r.is_free_slot,
    userId: r.user_id,
    createdAt: r.created_at,
    createdBy: r.created_by,
    updatedAt: r.updated_at,
    updatedBy: r.updated_by,
  };
}
function mapBlockRow(r: BlockRow): ScheduleBlock {
  return {
    id: r.id,
    taskId: r.task_id,
    day: r.day,
    order: Number(r.order),
    duration: Number(r.duration),
    overflow: r.overflow,
    start: r.start_minutes,
    end: r.end_minutes,
    label: r.label ?? undefined,
  };
}
function mapHistoryRow(r: HistoryRow): HistoryEntry {
  return { id: r.id, blockId: r.block_id ?? "", taskId: r.task_id, ts: new Date(r.ts).getTime(), text: r.text, isMove: r.is_move };
}

// ---------------- shared helpers ----------------

async function requireAdmin() {
  const appUser = await getOrCreateAppUser();
  if (!appUser.isAdmin) throw new Error("Only admins can do this.");
  return appUser;
}

async function getOwnedTask(supabase: SupabaseAdmin, taskId: string, userId: string) {
  const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Task not found.");
  if (data.user_id !== userId) throw new Error("You can only modify your own tasks.");
  return data;
}

// Admins manage teammates' flat task list from Team, never their own —
// their own tasks are block-scheduled and editing estimated_hours here
// would desync schedule_blocks.duration with no recalculation path.
async function getAdminManagedTask(supabase: SupabaseAdmin, taskId: string, adminUserId: string) {
  const { data, error } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Task not found.");
  if (data.user_id === adminUserId) throw new Error("Manage your own tasks from Today.");
  return data;
}

interface SettingsRow {
  work_start: string;
  capacity: number | string;
  default_slot: number | string;
}

// user_settings rows are supposed to be created alongside the user (see
// getOrCreateAppUser), but self-heal here too in case that insert was ever
// skipped or failed, so a missing row never crashes the app.
async function getOrCreateUserSettings(supabase: SupabaseAdmin, userId: string): Promise<SettingsRow> {
  const { data: existing } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
  if (existing) return existing as SettingsRow;

  const { data: created, error } = await supabase
    .from("user_settings")
    .insert({ user_id: userId, work_start: "09:00", capacity: 8, default_slot: 60 })
    .select("*")
    .single();
  if (error) throw error;
  return created as SettingsRow;
}

// Finds the first working day (starting today) with room for `duration` hours
// against the user's daily `capacity` — an empty day is always accepted even
// if the task alone exceeds capacity (mirrors how a lone oversized block
// behaves for a self-created task, which just gets marked overflow in place).
async function findNextAvailableDay(supabase: SupabaseAdmin, userId: string, duration: number, capacity: number): Promise<string> {
  const { data: rows } = await supabase.from("schedule_blocks").select("day, duration, tasks!inner(user_id)").eq("tasks.user_id", userId);
  const totals = new Map<string, number>();
  ((rows ?? []) as { day: string; duration: number | string }[]).forEach((b) => {
    totals.set(b.day, (totals.get(b.day) ?? 0) + Number(b.duration));
  });

  let cursor = keyToDate(TODAY_KEY);
  while (!isWorkday(cursor)) cursor = nextWorkday(cursor);
  for (let i = 0; i < 365; i++) {
    const key = dkey(cursor);
    const used = totals.get(key) ?? 0;
    if (used === 0 || used + duration <= capacity) return key;
    cursor = nextWorkday(cursor);
  }
  return dkey(cursor);
}

async function renormalizeDayOrder(supabase: SupabaseAdmin, userId: string, day: string) {
  const { data } = await supabase.from("schedule_blocks").select("id, order, tasks!inner(user_id)").eq("day", day).eq("tasks.user_id", userId).order("order", { ascending: true });
  await Promise.all((data ?? []).map((r: OrderRow, idx: number) => supabase.from("schedule_blocks").update({ order: idx }).eq("id", r.id)));
}

// Recalculates every one of the user's blocks (across all days) using the exact
// same engine as the client, then persists whatever changed and logs history —
// the server never trusts client-sent overflow/start/end values.
async function recalcAndPersist(supabase: SupabaseAdmin, userId: string, logChanges: boolean) {
  const settingsRow = await getOrCreateUserSettings(supabase, userId);
  const settings = { workStart: settingsRow.work_start, workEnd: "", capacity: Number(settingsRow.capacity), defaultSlot: Number(settingsRow.default_slot) };
  engine.deriveWorkEnd(settings);

  const { data: blockRows } = await supabase.from("schedule_blocks").select("*, tasks!inner(user_id)").eq("tasks.user_id", userId);
  const blocks = (blockRows ?? []).map(mapBlockRow);
  const before = new Map(blocks.map((b) => [b.id, { overflow: b.overflow, start: b.start, end: b.end }]));

  const historyToInsert: { id: string; block_id: string; task_id: string; text: string; is_move: boolean }[] = [];
  const state: WorkTimeState = { settings, blocks, users: [], projects: [], tasks: [], history: [], currentUserId: userId };
  engine.recalcAll(state, logChanges, (block, text, isMove) => {
    historyToInsert.push({ id: crypto.randomUUID(), block_id: block.id, task_id: block.taskId, text, is_move: isMove });
  });

  const changed = blocks.filter((b) => {
    const prior = before.get(b.id)!;
    return prior.overflow !== b.overflow || prior.start !== b.start || prior.end !== b.end;
  });

  await Promise.all([
    ...changed.map((b) => supabase.from("schedule_blocks").update({ overflow: b.overflow, start_minutes: b.start, end_minutes: b.end }).eq("id", b.id)),
    historyToInsert.length ? supabase.from("schedule_history").insert(historyToInsert) : Promise.resolve(null),
  ]);
}

// ---------------- initial load ----------------

export async function loadWorkTimeState(): Promise<WorkTimeState> {
  const appUser = await getOrCreateAppUser();
  const supabase = createSupabaseAdminClient();

  const [{ data: userRows }, { data: projectRows }, settingsRow, { data: ownTaskRows }, { data: teammateTaskRows }, { data: blockRows }, { data: historyRows }] = await Promise.all([
    supabase.from("users").select("*").order("created_at"),
    supabase.from("projects").select("*").order("name"),
    getOrCreateUserSettings(supabase, appUser.id),
    supabase.from("tasks").select("*, projects(name)").eq("user_id", appUser.id).order("created_at", { ascending: false }),
    // Teammates' tasks are visible org-wide (what everyone is currently working on),
    // but their schedule_blocks are not — there is no per-day timeline for them here.
    supabase.from("tasks").select("*, projects(name)").neq("user_id", appUser.id).order("created_at", { ascending: false }),
    supabase.from("schedule_blocks").select("*, tasks!inner(user_id)").eq("tasks.user_id", appUser.id),
    supabase.from("schedule_history").select("*, tasks!inner(user_id)").eq("tasks.user_id", appUser.id).order("ts", { ascending: false }),
  ]);

  const settings = { workStart: settingsRow.work_start, workEnd: "", capacity: Number(settingsRow.capacity), defaultSlot: Number(settingsRow.default_slot) };
  engine.deriveWorkEnd(settings);

  return {
    settings,
    users: (userRows ?? []).map(mapUserRow),
    projects: (projectRows ?? []).map(mapProjectRow),
    tasks: [...(ownTaskRows ?? []), ...(teammateTaskRows ?? [])].map(mapTaskRow),
    blocks: (blockRows ?? []).map(mapBlockRow),
    history: (historyRows ?? []).map(mapHistoryRow),
    currentUserId: appUser.id,
  };
}

// ---------------- task / schedule mutations ----------------

export interface CreateTaskActionInput {
  taskId: string;
  blockId: string;
  title: string;
  project?: string;
  description: string;
  priority?: Priority;
  isFreeSlot: boolean;
  duration: number;
  day: string;
  position: string; // block id, or "end"
}

export async function createTaskAction(input: CreateTaskActionInput) {
  const appUser = await getOrCreateAppUser();
  const supabase = createSupabaseAdminClient();

  let projectId: string | null = null;
  if (!input.isFreeSlot) {
    const { data: project } = await supabase.from("projects").select("id").eq("name", input.project).maybeSingle();
    if (!project) throw new Error(`Unknown project "${input.project}".`);
    projectId = project.id;
  }

  const { error: taskError } = await supabase.from("tasks").insert({
    id: input.taskId,
    title: input.title,
    project_id: projectId,
    description: input.description,
    estimated_hours: input.duration,
    priority: input.isFreeSlot ? null : input.priority,
    is_free_slot: input.isFreeSlot,
    user_id: appUser.id,
    created_by: appUser.id,
    updated_by: appUser.id,
  });
  if (taskError) throw taskError;

  const { data: dayBlocks } = await supabase.from("schedule_blocks").select("id, order, tasks!inner(user_id)").eq("day", input.day).eq("tasks.user_id", appUser.id);
  const rows: OrderRow[] = dayBlocks ?? [];
  const maxOrder = Math.max(-1, ...rows.map((b) => Number(b.order)));
  let order: number;
  if (input.position === "end" || !input.position) {
    order = maxOrder + 1;
  } else {
    const before = rows.find((b) => b.id === input.position);
    order = before ? Number(before.order) - 0.5 : maxOrder + 1;
  }

  const { error: blockError } = await supabase.from("schedule_blocks").insert({
    id: input.blockId,
    task_id: input.taskId,
    day: input.day,
    order,
    duration: input.duration,
    overflow: false,
  });
  if (blockError) throw blockError;

  await renormalizeDayOrder(supabase, appUser.id, input.day);
  await recalcAndPersist(supabase, appUser.id, true);
}

export async function moveBlockToNextDayAction(blockId: string) {
  const appUser = await getOrCreateAppUser();
  const supabase = createSupabaseAdminClient();

  const { data: blockRow, error } = await supabase.from("schedule_blocks").select("*, tasks!inner(user_id)").eq("id", blockId).maybeSingle();
  if (error) throw error;
  if (!blockRow) throw new Error("Block not found.");
  if (blockRow.tasks.user_id !== appUser.id) throw new Error("You can only move your own tasks.");

  const dest = dkey(nextWorkday(keyToDate(blockRow.day)));
  const { data: destBlocks } = await supabase.from("schedule_blocks").select("order, tasks!inner(user_id)").eq("day", dest).eq("tasks.user_id", appUser.id);
  const maxOrder = Math.max(-1, ...((destBlocks ?? []) as { order: number | string }[]).map((b) => Number(b.order)));

  const { error: updateError } = await supabase.from("schedule_blocks").update({ day: dest, order: maxOrder + 1 }).eq("id", blockId);
  if (updateError) throw updateError;

  await recalcAndPersist(supabase, appUser.id, false);
  await supabase.from("schedule_history").insert({
    id: crypto.randomUUID(),
    block_id: blockId,
    task_id: blockRow.task_id,
    text: `Manually moved to ${fmtShort(keyToDate(dest))}.`,
    is_move: true,
  });
}

export async function commitOrderAction(day: string, orderedBlockIds: string[]) {
  const appUser = await getOrCreateAppUser();
  const supabase = createSupabaseAdminClient();

  const { data: rows } = await supabase.from("schedule_blocks").select("id, tasks!inner(user_id)").eq("day", day).eq("tasks.user_id", appUser.id);
  const owned = new Set(((rows ?? []) as { id: string }[]).map((r) => r.id));
  const ids = orderedBlockIds.filter((id) => owned.has(id));

  await Promise.all(ids.map((id, idx) => supabase.from("schedule_blocks").update({ order: idx }).eq("id", id)));
  await recalcAndPersist(supabase, appUser.id, true);
}

export interface UpdateTaskActionInput {
  taskId: string;
  title: string;
  project?: string;
  description: string;
  priority?: Priority;
  isFreeSlot: boolean;
  duration: number;
}

export async function updateTaskAction(input: UpdateTaskActionInput) {
  const appUser = await getOrCreateAppUser();
  const supabase = createSupabaseAdminClient();
  await getOwnedTask(supabase, input.taskId, appUser.id);

  let projectId: string | null = null;
  if (!input.isFreeSlot) {
    const { data: project } = await supabase.from("projects").select("id").eq("name", input.project).maybeSingle();
    if (!project) throw new Error(`Unknown project "${input.project}".`);
    projectId = project.id;
  }

  const { error: taskError } = await supabase
    .from("tasks")
    .update({
      title: input.title,
      project_id: projectId,
      description: input.description,
      estimated_hours: input.duration,
      priority: input.isFreeSlot ? null : input.priority,
      is_free_slot: input.isFreeSlot,
      updated_by: appUser.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.taskId);
  if (taskError) throw taskError;

  const { data: blockRows } = await supabase.from("schedule_blocks").select("id").eq("task_id", input.taskId);
  if ((blockRows ?? []).length === 1) {
    const { error: blockError } = await supabase.from("schedule_blocks").update({ duration: input.duration }).eq("id", blockRows![0].id);
    if (blockError) throw blockError;
  }

  await recalcAndPersist(supabase, appUser.id, true);
}

export async function deleteTaskAction(taskId: string) {
  const appUser = await getOrCreateAppUser();
  const supabase = createSupabaseAdminClient();

  await getOwnedTask(supabase, taskId, appUser.id);
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;

  await recalcAndPersist(supabase, appUser.id, true);
}

// ---------------- settings ----------------

export async function saveSettingsAction(next: { workStart: string; capacity: number; defaultSlot: number }) {
  const appUser = await getOrCreateAppUser();
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: appUser.id, work_start: next.workStart, capacity: next.capacity, default_slot: next.defaultSlot }, { onConflict: "user_id" });
  if (error) throw error;

  await recalcAndPersist(supabase, appUser.id, true);
}

export async function resetSettingsAction() {
  await saveSettingsAction({ workStart: "09:00", capacity: 8, defaultSlot: 60 });
}

// ---------------- admin: users / projects ----------------

export async function addUserAction(input: { id: string; name: string; role: string; department: string; email: string; capacity: number }) {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();

  const { count } = await supabase.from("users").select("*", { count: "exact", head: true });
  const color = USER_COLOR_PALETTE[(count ?? 0) % USER_COLOR_PALETTE.length];

  const { error } = await supabase.from("users").insert({
    id: input.id,
    clerk_user_id: null,
    name: input.name,
    role: input.role,
    department: input.department,
    email: input.email,
    capacity: input.capacity,
    color,
    is_admin: false,
  });
  if (error) throw error;

  await supabase.from("user_settings").insert({ user_id: input.id, work_start: "09:00", capacity: input.capacity, default_slot: 60 });
}

export async function addProjectAction(input: { id: string; name: string; description: string; color: string }) {
  await requireAdmin();
  const supabase = createSupabaseAdminClient();

  const { data: existing } = await supabase.from("projects").select("id").ilike("name", input.name).maybeSingle();
  if (existing) throw new Error(`A project named "${input.name}" already exists.`);

  const { error } = await supabase.from("projects").insert({ id: input.id, name: input.name, color: input.color, description: input.description });
  if (error) throw error;
}

export async function setUserAdminAction(userId: string, isAdmin: boolean) {
  const appUser = await requireAdmin();
  if (userId === appUser.id && !isAdmin) throw new Error("You can't remove your own admin access.");

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("users").update({ is_admin: isAdmin }).eq("id", userId);
  if (error) throw error;
}

// ---------------- admin: managing a teammate's tasks (from Team) ----------------

export interface AdminTaskActionInput {
  title: string;
  project?: string;
  description: string;
  priority?: Priority;
  isFreeSlot: boolean;
  estimatedHours: number;
}

export async function adminCreateTaskAction(input: AdminTaskActionInput & { taskId: string; userId: string }) {
  const appUser = await requireAdmin();
  if (input.userId === appUser.id) throw new Error("Manage your own tasks from Today.");
  const supabase = createSupabaseAdminClient();

  let projectId: string | null = null;
  if (!input.isFreeSlot) {
    const { data: project } = await supabase.from("projects").select("id").eq("name", input.project).maybeSingle();
    if (!project) throw new Error(`Unknown project "${input.project}".`);
    projectId = project.id;
  }

  const { error: taskError } = await supabase.from("tasks").insert({
    id: input.taskId,
    title: input.title,
    project_id: projectId,
    description: input.description,
    estimated_hours: input.estimatedHours,
    priority: input.isFreeSlot ? null : input.priority,
    is_free_slot: input.isFreeSlot,
    user_id: input.userId,
    created_by: appUser.id,
    updated_by: appUser.id,
  });
  if (taskError) throw taskError;

  // Give it a real schedule_block too, or it never shows up on the
  // teammate's own Today/Calendar — those render from blocks, not the flat
  // task list. Placed at the teammate's next available slot (their own
  // existing schedule), same as a self-created task landing at day's end.
  const settingsRow = await getOrCreateUserSettings(supabase, input.userId);
  const day = await findNextAvailableDay(supabase, input.userId, input.estimatedHours, Number(settingsRow.capacity));

  const { data: dayBlocks } = await supabase.from("schedule_blocks").select("id, order, tasks!inner(user_id)").eq("day", day).eq("tasks.user_id", input.userId);
  const maxOrder = Math.max(-1, ...((dayBlocks ?? []) as OrderRow[]).map((b) => Number(b.order)));

  const { error: blockError } = await supabase.from("schedule_blocks").insert({
    id: crypto.randomUUID(),
    task_id: input.taskId,
    day,
    order: maxOrder + 1,
    duration: input.estimatedHours,
    overflow: false,
  });
  if (blockError) throw blockError;

  await recalcAndPersist(supabase, input.userId, true);
}

export async function adminUpdateTaskAction(input: AdminTaskActionInput & { taskId: string; reassignTo?: string }) {
  const appUser = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const existing = await getAdminManagedTask(supabase, input.taskId, appUser.id);

  let projectId: string | null = null;
  if (!input.isFreeSlot) {
    const { data: project } = await supabase.from("projects").select("id").eq("name", input.project).maybeSingle();
    if (!project) throw new Error(`Unknown project "${input.project}".`);
    projectId = project.id;
  }

  const { error: taskError } = await supabase
    .from("tasks")
    .update({
      title: input.title,
      project_id: projectId,
      description: input.description,
      estimated_hours: input.estimatedHours,
      priority: input.isFreeSlot ? null : input.priority,
      is_free_slot: input.isFreeSlot,
      ...(input.reassignTo ? { user_id: input.reassignTo } : {}),
      updated_by: appUser.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.taskId);
  if (taskError) throw taskError;

  const ownerId = input.reassignTo ?? existing.user_id;
  const { data: blockRows } = await supabase.from("schedule_blocks").select("id").eq("task_id", input.taskId);
  if ((blockRows ?? []).length === 1) {
    const { error: blockError } = await supabase.from("schedule_blocks").update({ duration: input.estimatedHours }).eq("id", blockRows![0].id);
    if (blockError) throw blockError;
  }

  await recalcAndPersist(supabase, ownerId, true);
}

export async function adminDeleteTaskAction(taskId: string) {
  const appUser = await requireAdmin();
  const supabase = createSupabaseAdminClient();
  const existing = await getAdminManagedTask(supabase, taskId, appUser.id);

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw error;

  await recalcAndPersist(supabase, existing.user_id, true);
}
