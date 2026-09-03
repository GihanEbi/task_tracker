# Implementation prompt — Edit task from Task Detail (self full edit, admin edit + reassign)

## Goal

`TaskDetailPanel` currently has no edit action at all (only Delete, for the task's own owner).
Per the user's request: when viewing your **own** task, you can edit everything you have (title,
project, description, priority, duration). When an **admin** views someone else's task, they can
edit everything too, plus reassign it to a different user.

## Skills read

None applies — plain Server Action + optimistic store mutation, following this codebase's existing
conventions (same shape as `createTaskAndInsert`/`adminCreateTask`). `AGENTS.md` §17/§35 already
list "task duration changed" as a required recalculation trigger — this closes that gap for the
signed-in user's own tasks.

## Code inspected

- `components/panels/TaskDetailPanel.tsx` — `isMine` branch has Delete only; `!isMine` branch
  shows a read-only "Viewing as admin…" note, no controls.
- `lib/scheduling/store.ts`, `actions.ts` — the already-implemented (by a separate concurrent
  change, `prompts/2026-09-03-admin-team-manage-tasks.md`) admin-on-teammate CRUD:
  `adminCreateTask`/`adminUpdateTask`/`adminDeleteTask` + matching actions, gated by
  `getAdminManagedTask` (rejects when `task.user_id === adminUserId` — admin can never touch their
  own task through this path). `components/modals/AdminTaskModal.tsx` is the existing edit/create
  form for that path.
- Confirmed via the seed data and `createTaskAndInsert`/`adminCreateTask`: every task reachable
  through the app today has either exactly one `schedule_block` (self-created via Today/quick
  insert) or zero (admin-created for a teammate — teammates never get blocks, since there's no
  day/position UI for them). The seed SQL's multi-block tasks are hand-authored demo flavor with
  no in-app action that can reproduce that shape.

## Decisions and assumptions

1. **Two separate edit paths, reusing existing infrastructure where it fits:**
   - **Self edit** (new): a task's own owner can edit title/project/description/priority/duration
     from `TaskDetailPanel`. New `updateTask`/`updateTaskAction`, modeled on `createTaskAndInsert`.
     If duration changes and the task has exactly one block (the normal case), that block's
     duration is updated too and a full `recalcAndPersist` runs — duration changes must ripple
     through overflow/next-day exactly like insertion does (§35). If a task has zero or more than
     one block (not reachable via any current UI action, only via hand-seeded data), blocks are
     left untouched — there's no unambiguous way to redistribute duration across many blocks, and
     inventing one isn't worth it for a state nothing in the app can currently produce.
   - **Admin edit + reassign** (extends the existing admin path): reuses `AdminTaskModal` and
     `adminUpdateTask`/`adminUpdateTaskAction`, adding an optional reassignment target. Opened from
     `TaskDetailPanel`'s `!isMine` branch for an admin viewer via the same
     `openAdminTaskModal({ userId: task.userId, taskId: task.id })` call `UserDetailPanel` already
     uses — no new modal needed, just a "Reassign to" field added to the existing one.
2. **Reassignment never touches `schedule_blocks`.** By the invariant above, any task an admin can
   reach through `getAdminManagedTask` (non-self-owned) has zero blocks, so changing `user_id`
   never leaves an orphaned or mismatched block. If the admin reassigns to themselves, the task
   simply becomes a normal flat (unscheduled) entry on their own list — same as any other
   admin-created teammate task, nothing block-related to reconcile.
3. **"Reassign to" lists every user** (including the admin, including the task's current owner as
   a no-op option) — simplest, and the user said "reassign to someone else" without carving out
   exceptions.
4. **Self edit cannot reassign.** The user's wording ties reassignment specifically to the admin
   case; self-editing stays scoped to "everything they have" (their own fields), not ownership.
5. **New UI state**: `ui.editTask: { taskId: string } | null` + `editTaskKey`, mirroring every other
   modal (`addTask`, `adminTask`, …). New `EditTaskModal.tsx`, same field layout as `AddTaskModal`
   minus day/position (not applicable — editing in place, not re-inserting).

## Files expected to change

- `lib/scheduling/store.ts` — `AdminTaskInput` gains optional `reassignTo?: string`; new
  `updateTask(taskId, input)`; `ui.editTask`/`editTaskKey` + open/close methods.
- `lib/scheduling/actions.ts` — new `updateTaskAction` (self-owned, syncs single block, recalcs);
  `adminUpdateTaskAction` accepts optional `userId` and updates `tasks.user_id` when present.
- `components/modals/EditTaskModal.tsx` — new, self-edit form.
- `components/modals/AdminTaskModal.tsx` — add "Reassign to" select, shown only in edit mode.
- `components/panels/TaskDetailPanel.tsx` — `isMine`: add "Edit task" button. `!isMine` +
  `viewerIsAdmin`: add "Edit task" button (opens `AdminTaskModal`); non-admin viewers keep the
  existing read-only note.
- `components/layout/AppShell.tsx` — render `<EditTaskModal>` alongside the existing modals.

## Functional requirements

- Viewing your own task: "Edit task" opens a pre-filled form (title/project/description/priority/
  duration); saving updates it in place, recalculates your schedule if duration changed, optimistic
  with rollback-on-failure toast, same pattern as every other mutation here.
- Viewing someone else's task as admin: "Edit task" opens the existing admin form, pre-filled,
  with an added "Reassign to" picker; saving can change any field and/or the owner.
- Viewing someone else's task as a non-admin: unchanged — read-only note, no controls.
- Server-side: self-edit rejects if you don't own the task (`getOwnedTask`); admin edit rejects
  non-admins and rejects if the target task is the admin's own (existing `getAdminManagedTask`
  guard, unchanged).

## Security considerations

- Both new/extended actions re-check ownership/admin status server-side, not just via UI hiding,
  consistent with every existing mutation in this file.

## Checks to run

`npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Manual test steps

1. Open one of your own tasks → Edit → change title/priority/duration → confirm it saves, and if
   duration changed, your Today timeline/overflow recalculates.
2. As admin, open a teammate's task → Edit → change a field and reassign to a different teammate →
   confirm it saves, disappears from the old owner's list, appears on the new owner's.
3. As a non-admin, open a teammate's task → confirm still read-only, no Edit button.
