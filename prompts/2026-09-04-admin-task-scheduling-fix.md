# Implementation prompt — Schedule admin-created teammate tasks onto a real slot

## Goal

Bug reported by the user: a task added to a teammate from Team (`AdminTaskModal`/`adminCreateTaskAction`) never appears on that teammate's own Today or Calendar tabs. Fix: it should be placed on the teammate's **next available slot** automatically, same as the app's core "insert work" narrative.

## Code inspected

- `lib/scheduling/actions.ts` (`adminCreateTaskAction`, prior version) — inserted only a `tasks` row, no `schedule_blocks` row. Today/Calendar render from `state.blocks`, which only ever contains rows with a real `schedule_blocks` entry — so admin-created teammate tasks were permanently invisible there, confirmed as a known gap in `prompts/2026-09-04-task-detail-edit-and-reassign.md`'s "Code inspected" section ("admin-created for a teammate — teammates never get blocks, since there's no day/position UI for them").
- `createTaskAction` — the existing self-service create flow: inserts task, computes `order` for a given `day` (chosen by the user via `AddTaskModal`/`QuickInsertPopover`), inserts one `schedule_blocks` row, then `recalcAndPersist` to compute start/end/overflow and log history. The admin path has no day-picker UI, so the day itself needs to be computed, not supplied.
- `recalcAndPersist(supabase, userId, logChanges)` — already generic over any `userId`; recomputes every block belonging to that user from scratch and persists whatever changed, logging history. Reused as-is for the teammate.
- `updateTaskAction` (self-edit, added by the concurrent `2026-09-04-task-detail-edit-and-reassign` change) — keeps a task's single block's `duration` in sync when hours are edited, then recalculates. Mirrored here for `adminUpdateTaskAction` since admin-created tasks now have a real block too.

## Decisions

- New `findNextAvailableDay(supabase, userId, duration, capacity)`: sums the teammate's *existing* `schedule_blocks` per day, walks forward from today (skipping weekends), and returns the first day where the task fits, or the first empty day if none fit within a bounded lookahead (365 days) — an empty day is always accepted even if the task alone exceeds capacity, matching how a single oversized block behaves for a self-created task (it just lands there and gets marked overflow, same as `recalcDay`'s existing logic).
- `adminCreateTaskAction` now creates the task row, calls `findNextAvailableDay`, inserts a `schedule_blocks` row at the end of that day's order, and calls `recalcAndPersist` for the teammate — identical shape to `createTaskAction`, just with a computed day instead of a UI-supplied one.
- `adminUpdateTaskAction` now syncs the task's single block's duration (if exactly one exists) and calls `recalcAndPersist` for the (possibly newly reassigned) owner — mirrors self-edit's existing convention. Reassignment does not relocate the block to a new slot in the new owner's schedule (out of scope here; not what was reported, and doing it well would need its own design pass).
- `adminDeleteTaskAction` now calls `recalcAndPersist` for the task's owner after deletion (the block itself cascades via FK), so remaining blocks re-flow — previously missing entirely.
- The client-side "TODAY" stat block / "· Today" markers in `UserDetailPanel` (an admin-side estimate from task order + capacity, since the admin's client never loads a teammate's real blocks) remain an approximation — updated its hint text to stop claiming teammates "don't have a persisted day-by-day schedule" (no longer true) and instead note the real schedule isn't visible from the admin panel. The `adminCreateTask` toast no longer guesses "today vs queued" from that heuristic, since the real placement is now server-computed and can't be predicted client-side without loading the teammate's blocks.

## Not doing

- Backfilling `schedule_blocks` for any admin-created tasks that predate this fix (they'd still show as unscheduled). Not reported as an issue; can be addressed on request (delete + recreate works today).
- Making the admin's client load teammates' real blocks for a fully accurate "Today" preview — bigger change, not requested.

## Checks to run

`npx tsc --noEmit`, `npm run lint`, `npm run build`.

## Manual test steps

1. As admin, add a task to a teammate whose day is currently empty → confirm it lands on today (assuming today is a working day) and appears when signed in as that teammate on Today/Calendar.
2. Add another task to the same teammate that would push today over capacity → confirm it rolls to their next working day instead of a false "queued" claim, and both are visible on the correct days as that teammate.
3. Edit an admin-created task's duration → confirm the corresponding block's duration and overflow recalculate correctly for the teammate.
4. Delete an admin-created (now-scheduled) task → confirm the block disappears and the teammate's remaining schedule recalculates (e.g. a previously-overflowed task may now fit).
