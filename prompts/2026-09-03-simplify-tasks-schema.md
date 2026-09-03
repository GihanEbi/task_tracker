# Implementation prompt — Simplify `tasks` schema (drop deadline/status/completed_hours/assigned_day, add created_by/updated_by)

## Goal

Per the user's explicit request, reduce the `tasks` table to exactly:
`id, title, project_id, description, estimated_hours, priority, user_id, created_at, created_by, updated_at, updated_by`.

That means **dropping** `deadline`, `status`, `completed_hours`, `assigned_day` (columns that don't
appear in the requested list) and **adding** `created_by`, `updated_by` (`created_at`/`updated_at`
already exist). The user confirmed this explicitly after being told it removes deadline-risk,
task-completion, and the task→day link used for teammate visibility (see "Decisions and
assumptions" below for the exact consequences, since they're larger than a column rename).

## Skills read

None matches — this is a schema-simplification + cascading UI change, not an auth/UI-integration
task the `clerk-*` skills cover, and no Postgres-specific technique is involved beyond a plain
`ALTER TABLE`. `supabase-postgres-best-practices` was considered but has nothing additional to add
for a drop-column/add-column migration on a small table. `AGENTS.md` is the binding spec; this
prompt follows its required workflow (§3).

## Code inspected

- `supabase/migrations/0001_init.sql`, `0002_enable_rls.sql`, `supabase/seed.sql` — current schema
  and demo data for `tasks`.
- `lib/scheduling/types.ts`, `engine.ts`, `store.ts`, `actions.ts`, `current-user.ts` — full data
  flow: DB row → `mapTaskRow` → `Task` → engine calculations → store methods → UI.
- Every consumer of the four fields being removed, via a targeted repo search:
  `components/modals/AddTaskModal.tsx`, `components/timeline/QuickInsertPopover.tsx`,
  `components/timeline/BlockCard.tsx`, `components/tasks/TasksView.tsx`,
  `components/panels/TaskDetailPanel.tsx`, `components/panels/ProjectDetailPanel.tsx`,
  `components/panels/UserDetailPanel.tsx`, `components/admin/TeamView.tsx`,
  `components/admin/ReportsView.tsx`.

## Decisions and assumptions

Confirmed with the user (two rounds of explicit confirmation, the second showing concrete
consequences):

1. **Deadline risk is fully removed.** `computeDeadlineStatus`, the `DeadlineStatus`/`DeadlineLevel`
   types, and every UI surface that shows deadline or risk (task detail "DEADLINE RISK" section and
   header badge, `TasksView` Deadline column, `BlockCard` "due" chip, `ProjectDetailPanel` task-list
   due dates, Reports' entire "At risk this week" section) are deleted, not stubbed.
2. **Task completion tracking is fully removed.** `TaskStatus`, `Task.status`, `Task.completedHours`,
   the "Mark complete" button/action (`store.markComplete`, `markCompleteAction`), the task-detail
   "PROGRESS" section's Completed/Remaining stats, and `status` badges in `TasksView`,
   `ProjectDetailPanel`, and `UserDetailPanel`'s agenda are deleted. `projectStats()` drops
   `totalDone`/`pct`; every consumer of project completion % (`ReportsView` progress bars,
   `ProjectDetailPanel` header badge + progress bar) is updated to show task count/estimated hours
   only, no completion percentage.
3. **Teammate day-level visibility is fully removed — this is the biggest side effect.**
   `assigned_day` was the *only* mechanism by which an admin could see what a teammate (not the
   signed-in user) has scheduled on a given day — teammates' `schedule_blocks` are never loaded
   client-side, only their tasks were, tagged with `assigned_day`. Without that column there is no
   data left to answer "what does Priya have scheduled today." Concretely:
   - `TeamView` team-member cards stop showing "Xh / Yh today" and the on-track/tight/overloaded
     badge+bar for teammates — cards show name, role, department, and daily capacity only.
   - `ReportsView`'s "Team workload — today" section loses the scheduled-hours/status column and
     the Mon–Fri status dots for teammates; it becomes a roster (name, role, capacity).
   - `UserDetailPanel`'s "TODAY", "TODAY'S AGENDA", and "THIS WEEK" sections only render when
     viewing your **own** profile (`isOwnProfile`); viewing a teammate shows identity, capacity,
     email, and projects only, with a note that their day-to-day schedule isn't visible.
   - `engine.summaryForUserDay` / `engine.scheduleItemsForUserDay` are simplified to only handle
     `userId === state.currentUserId` (their non-self branches, which read `assignedDay`, are
     deleted); callers must not invoke them for other users anymore.
   - This is a real feature loss versus the current app (AGENTS.md §27/§31 describe teammate
     workload visibility as an admin requirement). Rebuilding it properly would mean loading
     teammates' `schedule_blocks` server-side for admins — a materially bigger change the user did
     not ask for. Flagged here in writing; not implemented unless requested separately.
4. **`created_by`/`updated_by` semantics.** No task-editing action exists today (only create,
   delete, and the now-removed mark-complete). So in practice `created_by === updated_by === user_id`
   for every row for now — both are set once at creation from the caller's `appUser.id` and never
   change until a future edit feature exists. They're stored as `uuid references users(id)`,
   analogous to `user_id`.
5. **Sorting replacement.** `TasksView` and `ProjectDetailPanel`'s task list currently sort by
   deadline (ascending). With no deadline, both switch to sorting by `created_at` descending
   (newest task first) — the closest equivalent ordering that still uses a real, existing column.
   This requires exposing `createdAt` on the `Task` type (mapped from the already-existing
   `tasks.created_at` column, previously unmapped) and adding explicit `.order("created_at")` to
   the task queries in `loadWorkTimeState` for deterministic ordering (today's queries have no
   `ORDER BY`).
6. **Task-detail header badge.** Was the deadline-risk badge (`On Track`/`Tight Schedule`/`At Risk`/
   `Complete`). Removed outright rather than repurposed — there's no equivalent single-word status
   left to show there without inventing new semantics the user didn't ask for.
7. **Seed data.** `supabase/seed.sql`'s `tasks` insert drops the four columns' values and sets
   `created_by`/`updated_by` to each row's existing `user_id` value.

## Files expected to change

- `supabase/migrations/0003_simplify_tasks.sql` (new) — the schema migration.
- `supabase/seed.sql` — update the `tasks` insert.
- `lib/scheduling/types.ts` — remove `TaskStatus`, `DeadlineStatus`, `DeadlineLevel`,
  `Task.status`, `Task.completedHours`, `Task.deadline`, `Task.assignedDay`, `ScheduleItem.status`;
  add `Task.createdAt`, `Task.createdBy`, `Task.updatedAt`, `Task.updatedBy`.
- `lib/scheduling/engine.ts` — delete `computeDeadlineStatus`; simplify `summaryForUserDay` /
  `scheduleItemsForUserDay` to self-only; drop `completedHours` from `projectStats` (remove
  `totalDone`/`pct`, keep `count`/`totalEst`/`list`/`userIds`).
- `lib/scheduling/store.ts` — remove `markComplete`, `computeDeadlineStatus` wrapper; update
  `CreateTaskInput`/`createTaskAndInsert` to drop `deadline`.
- `lib/scheduling/actions.ts` — update `TaskRow`, `mapTaskRow`, `CreateTaskActionInput`,
  `createTaskAction` (drop the four columns, add `created_by`/`updated_by` on insert); delete
  `markCompleteAction`; add `.order("created_at")` to the task queries in `loadWorkTimeState`;
  rework the teammate-tasks query (no more `assigned_day` filter — teammates' tasks are no longer
  meaningfully queryable per-day, so this query is dropped or reduced to identity fields only, per
  point 3 above).
- `components/modals/AddTaskModal.tsx` — drop the `deadline: TODAY_KEY` line from `submit()`.
- `components/timeline/QuickInsertPopover.tsx` — drop `deadline: qi.day` from the
  `createTaskAndInsert` call.
- `components/timeline/BlockCard.tsx` — remove the "due …" chip.
- `components/tasks/TasksView.tsx` — remove Deadline/Status columns, sort by `createdAt` desc.
- `components/panels/TaskDetailPanel.tsx` — remove header badge, DEADLINE RISK section, Deadline
  and Status detail rows, Mark-complete button, Completed/Remaining progress stats; keep Estimated
  hours (moved into DETAILS), Priority, Schedule (own blocks unaffected), Schedule History, Delete.
- `components/panels/ProjectDetailPanel.tsx` — remove completion % badge/bar and Completed stat;
  remove per-task status badge and deadline sort/display (sort by `createdAt` desc instead).
- `components/panels/UserDetailPanel.tsx` — gate TODAY / TODAY'S AGENDA / THIS WEEK sections to
  `isOwnProfile`; teammate view shows identity/capacity/email/projects only.
- `components/admin/TeamView.tsx` — drop scheduled-hours/status badge/progress bar per card; show
  name, role, department, capacity only.
- `components/admin/ReportsView.tsx` — remove "At risk this week" section entirely; "Team workload
  — today" becomes a roster (no scheduled/status); "Project progress" drops the % column, shows
  task count + estimated hours only.
- `app/worktime.css` — remove now-dead selectors only if they become unused (e.g. risk-list-empty),
  otherwise leave styling alone.

## Functional requirements

- Creating a task no longer takes or needs a deadline; it's simply not tracked.
- Deleting a task, moving a block, reordering, and the whole timeline/overflow engine are
  **unaffected** — none of the removed fields feed daily capacity, overflow, or next-working-day
  logic (confirmed in `engine.ts`: `daySummary`, `statusFor`, `recalcAll`, `findNextWorkingDay`
  never read `deadline`/`status`/`completedHours`/`assignedDay`).
- No dead code paths: every deleted field's read/write sites are removed, not left as `undefined`
  references or silently-always-false conditionals.
- The app must build and run with zero references to the removed `Task`/DB fields.

## Security considerations

- `created_by`/`updated_by` are set server-side from the authenticated caller's resolved
  `appUser.id` (via `getOrCreateAppUser()`), never trusted from client input — consistent with
  existing `user_id` handling in `createTaskAction`.
- RLS is already locked to the secret key only (`0002_enable_rls.sql`); no policy changes needed.

## Acceptance criteria

- `tasks` table has exactly: `id, title, project_id, description, estimated_hours, priority,
  user_id, created_at, created_by, updated_at, updated_by`.
- Creating, viewing, deleting a task all work with no console/type errors.
- Task detail panel shows no deadline/status/completion UI; Mark-complete button is gone.
- Tasks view lists tasks sorted newest-created-first, no Deadline/Status columns.
- Team view and a teammate's user-detail panel show no fabricated/zeroed schedule data — only
  identity/capacity, with today's-schedule sections visible solely on your own profile.
- Reports has two sections (Team roster, Project progress-by-count); "At risk this week" is gone.
- Existing timeline behavior (insert, shift, overflow, next-working-day, drag reorder) is
  unchanged — verified by rerunning AGENTS.md §47 critical scenario (still deadline-free, since
  that scenario is about capacity/overflow, not deadline).

## Checks to run

- `npm run build` (or `next build`) — must complete with no type errors.
- `npm run lint` if configured.
- Manually run the migration against the dev Supabase project, re-run `seed.sql`.

## Manual test steps

1. Apply `0003_simplify_tasks.sql`, re-seed, load the app.
2. Create a task via Add-task modal and via quick-insert — confirm both work with no deadline
   field anywhere, and the new row lands with `created_by`/`updated_by` set.
3. Open task detail — confirm no deadline/status/mark-complete UI remains, delete still works.
4. Open Tasks view — confirm sort order (newest created first), no Deadline/Status columns.
5. Open Team view and Reports as an admin — confirm teammate cards/rows show no scheduled-hours
   or status data; open a teammate's user-detail panel and confirm today/agenda/week sections are
   hidden for them but present on your own profile.
6. Open a project detail panel — confirm no % complete, task list sorted by created date.
7. Insert a task between two existing blocks on Today view and confirm the shift/overflow/warning
   behavior from AGENTS.md §47 still works exactly as before (this logic never touched the removed
   fields).
