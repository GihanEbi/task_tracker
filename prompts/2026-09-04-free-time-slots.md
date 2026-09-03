# Implementation prompt — Free time slots (reuse `tasks` table)

## Goal

Add a "Free time slot" toggle to the Add-task and Edit-task modals. Toggled on: hide Project and
Priority (not applicable), keep Title/Description/Duration. A free slot is a first-class task —
same table, same `schedule_blocks` mechanics, editable, and toggleable back into a normal task
(fill in project + priority again) at any time.

## Skills read

`supabase-postgres-best-practices` — for the nullable-column migration (dropping `NOT NULL` on
`project_id`/`priority`, adding `is_free_slot`). No other skill applies; this is otherwise the same
Server Action + optimistic store pattern as every other task mutation in this codebase.

## Code inspected

- `supabase/migrations/0001_init.sql` (as altered by `0003_simplify_tasks.sql`) — current `tasks`:
  `project_id uuid not null references projects(id)`, `priority text not null check (... )`. Both
  need to become nullable; the check constraint already tolerates `NULL` (Postgres: `NULL IN (...)`
  is `NULL`, not `FALSE`, so an unmodified check constraint doesn't reject `NULL` priority).
- `lib/scheduling/types.ts`, `actions.ts`, `store.ts` — current `Task`: `project: string` (never
  empty in practice today — every task has a real project), `priority: Priority` (never null).
  `mapTaskRow` already falls back to `""` for a missing `projects` join (`r.projects?.name ?? ""`),
  so an empty/null project round-trips cleanly with no other type change needed there.
- `components/modals/AddTaskModal.tsx`, `EditTaskModal.tsx` — both already have the exact field set
  (title/project/priority/description/duration) this toggle needs to show/hide.
- `lib/scheduling/engine.ts` — confirmed nothing in the scheduling engine (`recalcAll`, `daySummary`,
  overflow, next-working-day) reads `project` or `priority` — a free slot occupies capacity exactly
  like any task, no engine changes needed.
- `lib/scheduling/engine.ts` `projectStats()` filters `state.tasks` by `t.project === projectName`
  — a free slot's empty project simply never matches any real project, so it's automatically
  excluded from every project-scoped view (`ProjectDetailPanel`, `ProjectsView`, `ReportsView`
  Projects section) with no extra filtering code needed.

## Decisions and assumptions

1. **New `tasks.is_free_slot boolean not null default false`**, plus `project_id` and `priority`
   both made nullable. No fake placeholder project (e.g. reusing the seed data's "Personal"
   project) — an actual `NULL` is the honest representation of "not applicable," and keeps free
   slots out of every project-based stat automatically (point above).
2. **Scoped to the self-serve modals only** (`AddTaskModal`, `EditTaskModal`) — not
   `QuickInsertPopover` (the user said "inside the add task popup" specifically) and not
   `AdminTaskModal` (admin-managed teammate tasks are a separate, unrequested extension). Both
   excluded modals keep working exactly as today; free slots just aren't creatable through them.
3. **Toggle is bidirectional in both modals** — creating starts as a normal task (toggle off);
   editing a free slot can turn it back into a normal task by toggling off and filling in
   project/priority (submit is disabled until a project is chosen, same guard as today, just now
   skipped entirely while the toggle is on).
4. **Rendering**: anywhere `task.project`/`task.priority` is shown, a free slot substitutes
   "Free time" for the project and omits the priority chip/badge — `TaskDetailPanel` (header +
   Priority detail row), `BlockCard` (sub-line + priority chip), `TasksView` (Project/Priority
   columns).
5. **Duration/description/title behave identically to a normal task** — a free slot is still a
   real `schedule_blocks` row, subject to the same insert/shift/overflow/next-working-day logic.

## Files expected to change

- `supabase/migrations/0004_free_time_slots.sql` (new).
- `lib/scheduling/types.ts` — `Task.priority: Priority | null`, `Task.isFreeSlot: boolean`.
- `lib/scheduling/actions.ts` — `TaskRow`/`mapTaskRow`; `createTaskAction`/`updateTaskAction` accept
  optional project/priority + `isFreeSlot`, write `NULL`/`is_free_slot` accordingly.
- `lib/scheduling/store.ts` — `CreateTaskInput` and the self `updateTask` input gain `isFreeSlot`
  and optional `project`/`priority`; `createTaskAndInsert`/`updateTask`/`adminCreateTask`/
  `adminUpdateTask` set `isFreeSlot` (`false` for the two admin ones, unchanged behavior).
- `components/modals/AddTaskModal.tsx`, `EditTaskModal.tsx` — toggle control; conditional
  Project/Priority field-row; submit-guard and payload adjust based on the toggle.
- `components/panels/TaskDetailPanel.tsx`, `components/tasks/TasksView.tsx`,
  `components/timeline/BlockCard.tsx` — free-slot-aware rendering per point 4.
- `app/worktime.css` — small toggle-switch style, reused by both modals.

## Functional requirements

- Toggling "Free time slot" on hides Project/Priority and clears any previously chosen value;
  toggling off restores empty selects for the user to fill in (submit stays disabled without a
  project, matching today's guard).
- A created/edited free slot behaves like any task: occupies a schedule block, participates in
  overflow/next-working-day, shows on the timeline, is editable and deletable the same way.
- Converting a free slot back to a normal task (via Edit) requires picking a project; priority
  defaults to High like a new task's default.

## Security considerations

No change to authorization — same ownership checks (`getOwnedTask`) as existing self-edit/create.

## Checks to run

`npx tsc --noEmit`, `npm run lint`, `npm run build`; apply the migration to the linked dev project.

## Manual test steps

1. Add task → toggle "Free time slot" on → Project/Priority disappear → fill title + duration →
   submit → appears on Today's timeline with a duration block, no priority chip, "Free time" label.
2. Open it → Edit → toggle off → pick a project + priority → save → now renders as a normal task.
3. Create a normal task, edit it, toggle "Free time slot" on, save → project/priority disappear
   from its detail/list/block views.
4. Insert a free slot between two existing blocks → confirm it participates in the shift/overflow
   exactly like a normal task (per the core scheduling scenario).
