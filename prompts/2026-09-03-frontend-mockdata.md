# Implementation prompt — Frontend application with mock data (from prototype)

## Goal

Rebuild the WorkTime prototype at `Design/worktime.html` as the real Next.js frontend, with
the exact same content: same views, same copy/labels, same visual design, same seed data,
same interactions (drag-and-drop reorder, quick insert, overflow, deadline risk, admin
screens). No backend/persistence/auth yet — state lives in-memory on the client, seeded from
the same mock data the prototype uses. No new features, no removed content.

## Skills read

No skill matched this task (pure frontend/React work, no Clerk/Supabase/design-system
integration requested). `AGENTS.md` (via `CLAUDE.md`) was read in full and is the binding
spec for this project — this prompt follows its required workflow (section 3) and file
layout (section 42).

## Code inspected

- `Design/worktime.html` (1917 lines) — full prototype: inline CSS design system, vanilla-JS
  scheduling engine (ordered blocks, overflow, next-working-day, deadline risk), 8 views
  (Today, Calendar, Tasks, Overview, Settings, Team, Projects, Reports), modals, right-side
  detail panels, toasts, quick-insert popover, native HTML5 drag-and-drop.
- `app/page.tsx`, `app/layout.tsx`, `app/globals.css` — stock `create-next-app` output, unused
  Tailwind boilerplate, Geist fonts. Nothing here is product code yet.
- `package.json` / `tsconfig.json` — Next 16.3.4, React 19.2.8, Tailwind v4 installed but not
  used by the prototype's design (prototype uses hand-written CSS custom properties, not
  Tailwind utility classes). `@/*` path alias maps to repo root.
- `node_modules/next/dist/docs/` does not exist in this install, so the "read Next docs first"
  step in `AGENTS.md` has nothing to read; proceeding on Next 16 App Router conventions
  (async-friendly layouts, `LayoutProps<"/">` typing already visible in `app/layout.tsx`).
- No `prompts/` directory existed yet (created it for this file).

## Decisions and assumptions

1. **Styling stays hand-written CSS, not Tailwind.** The prototype's entire visual system
   (colors, spacing, `.block-card`, `.gauge-panel`, etc.) is bespoke CSS driven by custom
   properties. Reimplementing it in Tailwind would risk subtly changing the "exact same
   content" the user asked to preserve. I'll carry the prototype's `<style>` block over
   almost verbatim into `app/worktime.css`, imported once in the root layout. Tailwind stays
   installed/untouched for any future work but isn't used by these screens.
2. **Fonts via `next/font/google`** (`IBM_Plex_Sans`, `IBM_Plex_Mono`, same weights the
   prototype loads) instead of the `<link>` tags, for Next's built-in font optimization. Same
   fonts, same weights, no visible difference.
3. **Real routes instead of a single client-side view switcher.** The prototype swaps
   `innerHTML` inside one page based on `data-view`. I'll use the App Router structure
   `AGENTS.md` §42 already recommends — `/today`, `/calendar`, `/tasks`, `/overview`,
   `/settings`, `/admin/team`, `/admin/projects`, `/admin/reports` — sharing a root layout
   that renders the sidebar. This is an infrastructure change (URLs are shareable/
   bookmarkable now), not a content change: every screen's markup, copy, and behavior stays
   identical. `/` redirects to `/today`. Flagging this explicitly since it's the one place I'm
   not doing a 1:1 literal port of the prototype's mechanism.
4. **Client-side state via a single React Context**, not per-page `useState`, because Today,
   Calendar, Tasks, Overview, and the sidebar's mini-gauge all read/write the same
   tasks/blocks/settings. This mirrors the prototype's single shared module-level state and
   matches `AGENTS.md` §36/§43's "one authoritative scheduling module" requirement. No
   database yet — this task is scoped to frontend + mock data only (per the user's request);
   persistence (§38) is out of scope until asked for.
5. **Seed data reproduced exactly**: same users (Alex Chen/you, Priya Nair, Marcus Webb,
   Jordan Lee), same projects (CRM, Sales, Meridian, Personal, General), same tasks/blocks for
   Mon–Fri of the seeded week, same fixed "today" = **Thu Sep 3, 2026** (matches the real
   current date, which is presumably why the prototype hardcodes it rather than using
   `new Date()` — preserved as-is for deterministic rendering, including on the server).
6. **Scheduling engine ported function-for-function** from the prototype's IIFE into
   `lib/scheduling/engine.ts` (`recalcDay`, `daySummary`, `statusFor`, `computeDeadlineStatus`,
   `findNextWorkday`, `insertTask`, `moveBlockToNextDay`, etc.), typed, with the same rules:
   ordered blocks recalculated from `workStart`, overflow when a block would end after
   `workEnd`, deadline risk from available capacity across working days excluding the task's
   own blocks. No behavior changes.
7. **Drag-and-drop reimplemented with React state** (reorder on `dragend`, not live DOM
   mutation during `dragover` as the prototype does) — same end-user result (drop before/after
   a card reorders the day and recalculates), implemented in a way that doesn't fight React's
   render cycle.
8. Out of scope, per the user's request being explicitly "frontend application with
   mockdata": authentication/authorization (§37), server persistence (§38), and anything under
   §41 ("what not to build"). Nothing here wires up Clerk or Supabase.

## Files expected to change

```
app/
  layout.tsx                       — replace boilerplate; load fonts + worktime.css, wrap
                                      children in <WorkTimeProvider><Sidebar>...
  page.tsx                         — replace boilerplate; redirect("/today")
  worktime.css                     — new; prototype's CSS, ported
  today/page.tsx                   — new
  calendar/page.tsx                — new
  tasks/page.tsx                   — new
  overview/page.tsx                — new
  settings/page.tsx                — new
  admin/team/page.tsx              — new
  admin/projects/page.tsx          — new
  admin/reports/page.tsx           — new
  globals.css                      — removed (unused Tailwind boilerplate) or left untouched
                                      and simply not imported, whichever keeps the diff cleanest

components/
  layout/Sidebar.tsx, Topbar.tsx, DateStrip.tsx
  timeline/Timeline.tsx, BlockCard.tsx, InsertGap.tsx, OverflowZone.tsx, QuickInsert.tsx
  modals/AddTaskModal.tsx, AddUserModal.tsx, AddProjectModal.tsx
  detail/TaskDetailPanel.tsx, UserDetailPanel.tsx, ProjectDetailPanel.tsx
  calendar/DayGrid.tsx
  overview/WeekChart.tsx
  tasks/TasksTable.tsx
  team/PeopleGrid.tsx
  projects/ProjectGrid.tsx
  reports/ReportPanels.tsx
  settings/SettingsForm.tsx
  ui/Toast.tsx, GaugePanel.tsx, Badge.tsx, ProgressBar.tsx

lib/scheduling/
  types.ts        — Task, ScheduleBlock, User, Project, Settings, HistoryEntry, DeadlineStatus
  dates.ts         — dkey/keyToDate/addDays/isWorkday/nextWorkday/fmt* ported 1:1
  engine.ts        — recalcDay/daySummary/statusFor/computeDeadlineStatus/etc.
  seed-data.ts     — users/projects/tasks/blocks exactly as in the prototype
  context.tsx      — WorkTimeProvider + useWorkTime()

prompts/2026-09-03-frontend-mockdata.md   — this file
```

## Functional requirements

Every behavior listed in `AGENTS.md` §46 "Acceptance criteria" that the prototype already
demonstrates, ported with identical wording/labels:

- Today view: greeting, capacity gauge (capacity/scheduled/remaining or overloaded), status
  pill (on track / at capacity / tight / overloaded), date strip (±2 days, jump to day),
  hourly timeline with draggable blocks, insert-between-cards affordance, overflow zone with
  "Move now", sidebar mini-gauge.
- Calendar view: 5-day grid (Mon–Fri around today), hours/capacity/status per day, click to
  jump to Today view for that day.
- Tasks view: table (Task/Project/Duration/Deadline/Status/Schedule), click row to open detail.
- Overview view: weekly chart (day, track bar, hours, status badge).
- Settings view: work start time, calculated end time (disabled input), capacity, default
  slot duration, save-and-recalculate / reset-to-defaults.
- Team (admin): people grid with today's hours/status/progress bar, add-user modal,
  user detail panel (today stats, agenda, week, contact) — read-only for teammates.
- Projects (admin): project grid with progress/avatars, add-project modal with color picker,
  project detail panel (progress, team, tasks).
- Reports (admin): team workload table with week dots, project progress table, at-risk task
  list.
- Add-task modal (full form) + quick-insert popover (title/duration/priority + "More
  options…" escalates to full modal).
- Task detail panel: description, progress, details, schedule, deadline risk, schedule
  history, mark-complete/delete for own tasks.
- Toasts for create/move/delete/settings actions, warn styling when overloaded.

## Scheduling behavior (must match prototype exactly)

- Blocks within a day are ordered; `recalcDay` walks them from `workStart`, marking a block
  `overflow` the instant `end > workEnd`; a workday's non-workday equivalent (weekend) marks
  everything overflow with null start/end.
- Inserting a task at a position renormalizes order (0.5 offsets collapsed to clean integers),
  then triggers `recalcAll(logChanges)`.
- `recalcAll(true)` diffs before/after `overflow` per block and pushes a history entry when a
  block newly overflows ("Pushed from … next available day is …") or newly fits again.
- Manual "move to next day" (`→` button / overflow card's "Move now") appends the block to the
  end of the destination day's order and recalculates.
- Deadline risk (`computeDeadlineStatus`) walks working days from today through the deadline,
  sums available capacity per day excluding the task's own blocks (or, for teammates, other
  tasks assigned that day), and classifies On Track (spare ≥ 2h) / Tight Schedule (0 ≤ spare <
  2h) / At Risk (spare < 0) / Complete.
- Weekends are skipped everywhere a "next working day" is computed.
- Settings changes (`workStart`, `capacity`, `defaultSlot`) call `deriveWorkEnd()` then
  `recalcAll(true)` — end time is never set directly.

## Security considerations

None apply yet — this is a client-only, unauthenticated mock-data build with no network
calls, no user-supplied HTML beyond what's already escaped (`escapeHtml` in the prototype
becomes plain JSX text interpolation, which React escapes by default — no `dangerouslySetInnerHTML`
anywhere). No secrets, no external requests, no persistence layer to protect.

## Acceptance criteria

- `npm run dev` serves `/today` (default route) matching the prototype's Today view content
  and behavior for the seeded Thursday.
- All 8 views render with the same structure/copy as the prototype.
- Critical scenario from `AGENTS.md` §47 works: adding a 2h "Proposal" task before "CRM
  Documentation" on a full 8h day pushes CRM Documentation to overflow with the correct
  warning and next-day destination.
- Settings capacity change (8h → 6h) immediately overflows and recalculates affected blocks,
  matching §49.
- Drag-and-drop reordering within the Today timeline updates order and recalculates.
- Admin Team/Projects/Reports show the same read-only teammate data and progress numbers as
  the prototype.
- `npm run lint` and `npm run build` pass with no errors.
- No prototype content (labels, copy, seed numbers, colors, layout) was altered or dropped;
  no unrequested features were added.

## Checks to run

- `npm run lint`
- `npm run build`
- Manual walkthrough of the scenarios below.

## Manual test steps

1. Load `/today` — verify Thu Sep 3, 2026, gauge shows 8h/8h/0h remaining (fully scheduled),
   status "At capacity", 5 blocks on the timeline, matching the prototype exactly.
2. Hover between "CRM Testing"-equivalent block and "CRM Documentation" block, click
   "+ Add task here", add a 2h task — confirm it inserts at that position, the day now shows
   10h scheduled, the last block moves to the overflow zone with a "Pushed to Fri Sep 4…"
   note, and a toast reports "2h over capacity".
3. Click "Move now" on the overflow card — confirm it disappears from today and a block
   appears on Friday.
4. Drag a block above another block on Today — confirm order and times recalculate.
5. Go to Settings, change capacity 8 → 6, Save — confirm Today overflows accordingly and the
   sidebar gauge updates.
6. Open Tasks, click a row — confirm the detail panel shows progress/deadline
   risk/schedule/history, and Mark complete / Delete work and update the list.
7. Go to Team (admin) — click a teammate — confirm the read-only detail panel (today stats,
   agenda, week dots, contact) matches the prototype's data for Priya/Marcus/Jordan.
8. Go to Projects (admin) — Add project via modal — confirm it's immediately selectable in
   the Add Task modal's project dropdown.
9. Go to Reports (admin) — confirm "At risk this week" lists exactly the tasks whose deadline
   status is Tight/At Risk, matching the same task set the prototype would flag.
10. Resize the window below 880px — confirm the responsive sidebar/nav collapse matches the
    prototype's `@media` rules.
