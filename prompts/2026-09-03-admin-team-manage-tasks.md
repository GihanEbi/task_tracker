# Implementation prompt — Admin: manage a teammate's tasks from Team

## Goal

On `/admin/team`, when an admin selects a teammate (opens their detail panel), the admin should be able to:

1. See that teammate's **today's tasks**.
2. **Add** a new task for that teammate.
3. **Edit** an existing task belonging to that teammate.
4. **Remove (delete)** a task belonging to that teammate.

Scoped to admin-viewing-a-teammate only. Viewing your own card keeps today's behavior unchanged (self-management stays on the Today page).

## Revision note

This prompt was rewritten mid-implementation. The original version (same file, written earlier today) assumed the pre-simplification schema (`tasks.deadline`/`status`/`completed_hours`/`assigned_day`). Before writing code, re-inspection showed `prompts/2026-09-03-simplify-tasks-schema.md` had already been implemented, which **removed all four of those columns**, including `assigned_day` — the only field that ever tied a teammate's task to a specific day. That schema change was made at the user's own explicit request earlier today, with its writeup flagging in point 3 that "teammate day-level visibility is fully removed" as a known, accepted consequence.

This directly conflicted with the new request, so the user was asked how "today's tasks" should work now with no day field available. Their answer: **derive it** — "No need assigned date... we can show it with task order. We know how much time a user works and estimate hours. You can get the data from it and map those to dates." This prompt implements that: a pure, unpersisted client-side calculation, no migration.

## Skills read

None of the installed skills (Clerk, Supabase) govern this change — plain Server Action + service-role Supabase client work, and a pure TypeScript scheduling calculation, both following existing codebase conventions. `AGENTS.md` remains the binding spec:
- §28: admin manipulating a teammate's tasks is now explicitly requested (was previously "unless explicitly requested").
- §37: authorization enforced server-side, not just hidden client-side.
- §14/§43: keep scheduling math in the domain module (`engine.ts`), not duplicated in components.
- §41: no confirmation-heavy flows — matches the app's single-click + toast + rollback pattern.

## Code inspected (current state, post-simplification)

- `lib/scheduling/types.ts` — current `Task`: `id, title, project, description, estimatedHours, priority, userId, createdAt, createdBy, updatedAt, updatedBy`. No day/deadline/status field of any kind. `WorkTimeState`, `WorkloadSummary`, `ScheduleItem` also already stripped of status/overflow-for-teammates concepts.
- `lib/scheduling/engine.ts` — `summaryForUserDay`/`scheduleItemsForUserDay` now take no `userId` (self-only, driven by `state.blocks`, which only ever contains the signed-in user's own blocks). `tasksForUser(state, userId)` still exists and returns a flat, unordered list for any user — this is the only teammate data available to build from.
- `lib/scheduling/actions.ts` — `loadWorkTimeState` loads **every** teammate's tasks unconditionally now (`neq("user_id", appUser.id)`, no `assigned_day` filter, ordered `created_at desc`), so a newly created teammate task is immediately visible in the admin's loaded state — no round trip needed. `requireAdmin()` and the ownership-check pattern (`getOwnedTask`, self-only) are the templates to follow for new admin-on-teammate actions (a new helper is needed since `getOwnedTask` rejects non-self tasks).
- `components/panels/UserDetailPanel.tsx` (current) — non-self branch shows a flat "TASKS" list (title/project/hours/priority), read-only, no day concept. Self branch still shows real "TODAY"/"TODAY'S AGENDA" from actual blocks. This is where the new controls attach.
- `components/admin/TeamView.tsx` (current) — cards show task *count* only, no schedule info, per the simplification. Left unchanged — the new feature lives in the detail panel, not the grid.
- `lib/scheduling/dates.ts` — `TODAY_KEY`/`TODAY_DATE` fixed to a hardcoded date (2026-09-03) for deterministic rendering; `isWorkday`, `addDays`, `dkey`, `keyToDate` available for the derivation.
- `supabase/migrations/0001_init.sql` (as altered by `0003_simplify_tasks.sql`, not re-read in full here since `types.ts`/`actions.ts` already reflect the post-migration column set) — no schema changes are needed for this feature; every field this feature touches already exists.

## Decisions & assumptions

- **No schema/migration changes.** Every field this feature needs (`title`, `project`, `description`, `estimated_hours`, `priority`) already exists on `tasks`. "Today" is computed, not stored.
- **Derived scheduling algorithm, new pure function in `engine.ts`**: `deriveDailyBuckets(tasks, capacity, startKey)`. Sorts a user's tasks oldest-`createdAt`-first (their natural creation order — no explicit order field exists for teammates), then greedily packs them into consecutive **working** days against `capacity` hours/day: a task is added to the current day if it fits (or if the day is still empty, even if it alone exceeds capacity — mirrors how a single oversized block behaves for the signed-in user's real timeline); otherwise it rolls to the next working day. This mirrors the app's core "insert work, overflow to next working day" narrative (AGENTS.md's central scenario), just computed on the fly instead of persisted.
- **"Today's tasks" = the first bucket**, if its key equals `TODAY_KEY`; otherwise empty (e.g. capacity is somehow 0). Exposed via `engine.todayBucketForUser(state, userId, todayKey)` → `store.todayBucketForUser(userId)`.
- **This is informational, not authoritative** — recomputed fresh on every render from whatever tasks currently exist; adding/editing/deleting a task immediately changes which bucket everything downstream lands in. No block, no persisted day, no drag-reorder — deliberately much simpler than the self timeline, matching the flat task model teammates already have.
- **Self excluded, same reasoning as before**: the signed-in user's own tasks are real block-scheduled data (`schedule_blocks.duration` tracks `estimated_hours` and is set once at creation). Editing `estimated_hours` for your own task through a flat, block-unaware action would desync the block's duration from the task's hours with no recalculation path. So this control only ever appears when viewing someone else, and the new Server Actions **reject** targeting the caller's own tasks server-side too (defense in depth, not just UI hiding, per §37) — mirrors the self-demotion guard already in `setUserAdminAction`.
- **UI shows the full task list, not just today's slice.** "TODAY" is a stats summary + inline "· Today" marker on whichever rows land in today's derived bucket; Add/Edit/Delete apply to any of the teammate's tasks in the list, not only today's — the request is to manage "the user's tasks" broadly, with "today's" specifically being what's surfaced as the headline view. Rationale: hiding a teammate's other (non-today) tasks from admin edit/delete would be a pure regression versus what's visible today, and the ask doesn't say to restrict editing to only today's slice.
- **New Server Actions**, mirroring existing conventions (no zod, plain thrown `Error`, service-role client), all gated by `requireAdmin()` plus the new self-target guard:
  - `adminCreateTaskAction({ taskId, userId, title, project, description, priority, estimatedHours })`
  - `adminUpdateTaskAction({ taskId, title, project, description, priority, estimatedHours })`
  - `adminDeleteTaskAction(taskId)`
  - None call `recalcAndPersist` — there are no schedule_blocks for teammate tasks to recalculate.
- **Toast on create warns if the new task doesn't land in today's bucket** (i.e. the teammate's day is already full per the derived calculation) — same spirit as `createTaskAndInsert`'s overflow warning, adapted to the derived model.
- **No confirmation modal for delete** — consistent with every other delete/toggle in the app.
- **New UI state**: `ui.adminTask: { userId: string; taskId?: string } | null` + `adminTaskKey` remount counter, mirroring `addTask`/`addUser`/`addProject`. Absent `taskId` = create mode, present = edit mode. One shared modal (`AdminTaskModal`) handles both.
- **Not doing**: reintroducing any persisted per-day field; changing the self/Today experience at all; showing this derived view anywhere except the Team → user-detail panel; drag-reordering teammates' virtual schedule (there's nothing to persist an order into).

## Files expected to change

- `lib/scheduling/engine.ts` — add `DerivedDayBucket` interface, `deriveDailyBuckets()`, `todayBucketForUser()`.
- `lib/scheduling/actions.ts` — add `getAdminManagedTask()` helper (rejects self-owned tasks), `adminCreateTaskAction`, `adminUpdateTaskAction`, `adminDeleteTaskAction`.
- `lib/scheduling/store.ts` — add `ui.adminTask`/`adminTaskKey`, `AdminTaskModalState` type, `openAdminTaskModal`/`closeAdminTaskModal`, `todayBucketForUser(userId)`, `adminCreateTask(userId, input)`, `adminUpdateTask(taskId, input)`, `adminDeleteTask(taskId)`.
- `components/modals/AdminTaskModal.tsx` — new modal (create/edit form: title, project, priority, description, duration).
- `components/panels/UserDetailPanel.tsx` — non-self branch: add a derived "TODAY" stats block, a "· Today" marker on matching task rows, a "+ Add task" action, and per-row Edit/Delete (admin viewers only).
- `components/layout/AppShell.tsx` — render `<AdminTaskModal>` conditionally in `Overlays()`.

## Functional requirements

- Viewing a teammate (not yourself) as admin shows a "TODAY" stats block (capacity / derived-scheduled / overloaded-or-remaining) computed from their current task list and daily capacity, plus a short note that it's estimated from task order, not a persisted schedule.
- The teammate's task list shows every task; any task landing in today's derived bucket is marked "· Today".
- "+ Add task" opens a modal (title, project, priority, description, duration) and creates a task for that teammate — optimistic, toast, rollback on failure. If the new task doesn't land in today's bucket (day already full), the toast says so.
- "Edit" opens the same modal pre-filled; submitting updates the task in place — optimistic, toast, rollback on failure.
- "Delete" removes the task immediately — optimistic, toast, rollback on failure, no confirmation dialog.
- Viewing your own card shows none of these controls — unchanged from today.
- A non-admin has no way (UI or direct action call) to create/edit/delete another user's task; an admin cannot use these actions on their *own* tasks either (server-side rejection either way).

## Scheduling behavior

The real block-based engine (`recalcAll`, `recalcDay`, overflow, next-working-day, drag reorder) is completely untouched — this feature never reads or writes `schedule_blocks`. The new `deriveDailyBuckets` is a separate, read-only, non-persisted calculation used only to render a "today" view for users who have no real timeline. No recalculation triggers apply to it; it simply re-evaluates from current `tasks` state on every read.

## Security considerations

- All three new Server Actions call `requireAdmin()` before touching the database.
- `adminCreateTaskAction` rejects `input.userId === appUser.id`; `adminUpdateTaskAction`/`adminDeleteTaskAction` fetch the task first and reject if `task.user_id === appUser.id` — both server-side, not just absent from the UI, closing the self-target gap described in Decisions.
- No new data exposure — admins already receive every teammate's task fields in full via `loadWorkTimeState`; this only adds admin-gated mutation of that same data.

## Acceptance criteria

- [ ] As an admin, open a teammate's detail panel → "TODAY" stats block and "+ Add task" are visible; task rows landing in today's bucket show "· Today".
- [ ] Open your own card → no add/edit/delete controls, no change from current behavior.
- [ ] Add a task for a teammate → appears in their task list immediately, persists after reload; if it doesn't land in today's bucket, the toast explains why.
- [ ] Edit a teammate's task (title/project/priority/description/duration) → updates immediately, persists after reload, and can shift which tasks are marked "· Today" if hours change.
- [ ] Delete a teammate's task → disappears immediately, stays gone after reload, and can pull a later task into today's bucket if it frees up capacity.
- [ ] Simulate a server failure → optimistic change rolls back with an error toast.
- [ ] Directly invoking any of the three new actions as a non-admin throws "Only admins can do this."; invoking them against the caller's own task (as an admin) throws the self-target error.
- [ ] `npx tsc --noEmit` and `npm run lint` pass.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Manual test steps

1. `npm run dev`, sign in as an admin.
2. Go to `/admin/team`, open a teammate who is not you. Confirm "TODAY" stats + "+ Add task" appear.
3. Add 2-3 tasks whose combined hours exceed the teammate's daily capacity → confirm only the ones that fit show "· Today", and the toast on the overflowing one explains it's queued.
4. Reload → confirm everything persisted and the "· Today" markers are recomputed identically.
5. Edit one of today's tasks to shrink its hours drastically → confirm a later task may now also pick up "· Today" after reload/re-render.
6. Delete a today task → confirm the next queued task shifts into today's bucket.
7. Open your own card → confirm no add/edit/delete controls appear.
8. Sign in as a non-admin → confirm `/admin/team` still redirects to `/today`.
