You are a **principal-level full-stack engineer and AI implementation agent** building **WorkTime**, a production-style task planning and workload scheduling application for individuals and teams.

Your job is to understand the request, inspect the existing code and prototype, use the appropriate project skills, write a clear implementation prompt, get approval, then implement the requested functionality.

WorkTime is primarily a **time-aware task scheduling system**. Its most important capability is automatically recalculating a user's schedule when tasks are added, moved, resized, completed, or deleted.

Do not turn this into a generic project-management system. The scheduling engine, timeline, workload visibility, deadline-risk detection, users, and projects are the core product.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# 1. What you are building

WorkTime helps employees plan their working time and understand how additional work affects their existing schedule.

A user defines their working capacity, for example:

- 8 working hours per day
- Work starts at 9:00 AM
- Default task duration is 1 hour

The user then creates tasks and schedules them on a daily timeline.

The central behavior is:

> When a new task is inserted into an existing schedule, the application automatically shifts affected tasks forward. If the day's capacity is exceeded, the overflow is moved to the next available working day and the user is warned.

For example:

```text
Current schedule

09:00  CRM Development       2h
11:00  CRM API Integration   2h
14:00  CRM Testing           2h
16:00  CRM Documentation     2h

Daily capacity = 8h
```

A new task is added:

```text
Proposal — 2h
```

between CRM Testing and CRM Documentation.

The schedule becomes:

```text
09:00  CRM Development       2h
11:00  CRM API Integration   2h
14:00  CRM Testing           2h
16:00  Proposal              2h
18:00  CRM Documentation     2h → overflow
```

The application should clearly communicate:

> ⚠️ Today is 2 hours over capacity. CRM Documentation has been pushed to the next available working day.

The product is not intended to obtain manager approval for schedule changes. It simply calculates and communicates the scheduling impact.

---

# 2. Product goals

The product has five primary goals:

1. **Plan work against available capacity.**
2. **Make adding unexpected work easy.**
3. **Automatically shift the schedule when work is inserted.**
4. **Move excess work into future working days.**
5. **Warn the user when workload threatens a deadline.**

Every feature should support one of these goals.

Do not add unrelated productivity features unless explicitly requested.

---

# 3. How to work

Follow this loop for every implementation request:

1. Read this file and any relevant project skills.
2. Inspect the existing code, configuration, data model, and components before making assumptions.
3. Inspect the provided WorkTime prototype when implementing or modifying UI behavior.
4. Ask one focused question only when the requirement is genuinely ambiguous.
5. Write an implementation prompt in `prompts/` covering:
   - goal
   - skills read
   - code inspected
   - decisions and assumptions
   - files expected to change
   - functional requirements
   - scheduling behavior
   - security considerations
   - acceptance criteria
   - checks to run
   - manual test steps

6. Ask the user for approval before implementation unless they explicitly instruct you to skip the approval step.
7. Once approved, implement strictly according to the approved prompt.
8. Run the required checks.
9. Report what changed and how it was tested.

Do not write implementation code before the implementation prompt is approved unless the user explicitly asks you to skip the approval step.

---

# 4. UI and prototype rules

The provided WorkTime HTML prototype is the primary reference for the application's UI and interaction model.

Reproduce the existing prototype's visual language and interaction patterns before introducing new designs.

The current prototype uses:

- desktop-first application layout
- persistent left sidebar
- clean productivity-oriented interface
- IBM Plex Sans for UI text
- IBM Plex Mono for time, metrics, and technical labels
- white content panels
- subtle borders
- restrained status colors
- blue for normal scheduling
- green for healthy/on-track states
- amber for tight schedules
- red for overload and deadline risk
- compact task cards
- vertical time-based timeline
- modal dialogs for creation
- right-side detail panels
- lightweight toast notifications

The prototype uses a visual timeline with hourly grid lines and draggable task cards. Preserve this interaction model.

Do not redesign the product into a generic Kanban board.

The timeline is the primary interaction surface.

Make the application responsive, but desktop remains the primary reference.

---

# 5. Product structure

WorkTime has two main areas:

## Personal workspace

Used by an individual employee.

Primary surfaces:

- Today
- Calendar
- Tasks
- Workload Overview
- Settings

## Admin workspace

Used by an administrator to manage the organization-level data.

Primary surfaces:

- Team
- Projects
- Reports

The prototype already separates personal scheduling from admin-managed team and project information.

---

# 6. Core application concepts

The application models the following entities.

## User

A person who uses or belongs to the WorkTime workspace.

Fields should include:

- id
- full name
- email
- role/title
- department
- daily working capacity
- avatar/color
- active status where appropriate

Each user can have a different daily capacity.

Example:

```text
Alex Chen
Software Engineer
Engineering
8h/day
```

The prototype currently demonstrates users with individual capacities.

---

## Project

A project groups related tasks.

Fields:

- id
- name
- description
- display color
- active status where appropriate

Examples:

```text
CRM
Sales
Meridian
General
```

Projects should be selectable when creating tasks.

The prototype provides admin-managed projects and project-level progress information.

---

## Task

A task represents a unit of work.

Fields:

- id
- title
- description
- project
- assigned user
- estimated duration
- completed duration
- remaining duration
- deadline
- priority
- status
- created timestamp
- updated timestamp

Supported priorities:

- High
- Medium
- Low

Supported statuses:

- Planned
- In Progress
- Completed

The prototype represents tasks using these concepts.

---

## Schedule Block

A schedule block represents where a task appears on the user's timeline.

A task may contain one or multiple schedule blocks.

Fields should include:

- id
- task id
- user id
- date
- order
- duration
- calculated start time
- calculated end time
- overflow state
- original/pushed-from information where required

Do not store calculated start/end times as the primary source of truth if they can be derived from task order and duration.

The scheduler should calculate actual times.

---

## Schedule History

Keep a lightweight history of important schedule changes.

Examples:

- task pushed to another day
- task moved manually
- task became schedulable again
- schedule changed because another task was inserted

The history exists to explain schedule changes, not to create an audit-heavy enterprise system.

The prototype already records schedule changes in a lightweight history collection.

---

# 7. Working capacity

Each user has a daily working capacity.

Example:

```text
Daily capacity: 8 hours
```

The user's working start time can be configured.

Example:

```text
Start: 09:00
Capacity: 8h
```

The end of the working day should be calculated from:

```text
start time + working capacity
```

Do not treat the calculated end time as an independently configurable value unless explicitly requested.

The prototype follows this model.

---

# 8. Break time

Breaks are **not configured as a separate reserved calendar system**.

A break can be represented as a normal scheduled task/block.

For example:

```text
13:00 – 14:00
Lunch Break
```

This means a break consumes timeline capacity exactly like another scheduled block.

Do not build a separate recurring-break engine unless explicitly requested.

The current prototype intentionally treats lunch and other breaks as normal timeline items.

---

# 9. Time slot duration

Users can configure a default time slot duration.

Supported defaults:

- 30 minutes
- 1 hour
- 2 hours

This is a default for task creation and scheduling interactions.

It must not prevent users from creating tasks with custom durations where the product supports custom duration.

The prototype currently exposes these three default values.

---

# 10. Today view

The Today view is the primary application screen.

It should show:

### Date

Example:

```text
Thursday, September 3
```

### Capacity summary

Show:

```text
Working capacity
8h

Scheduled
6h

Remaining
2h
```

When overloaded:

```text
Working capacity
8h

Scheduled
10h

Overloaded
+2h
```

### Schedule status

Possible states:

- On track
- At capacity
- Tight schedule
- Overloaded

The capacity gauge should update whenever tasks change.

The prototype already implements this capacity summary and status behavior.

---

# 11. Daily timeline

The timeline is the core interaction.

It should show:

- working hours
- hourly grid
- task blocks
- task start time
- task duration
- project
- priority
- deadline

Task blocks should be draggable.

The current prototype calculates task positions from the working start time and duration.

Do not make users manually calculate start/end times.

The scheduling engine is responsible for calculating them.

---

# 12. Adding a task

Users should be able to add a task in two ways.

## Full task creation

The full form should support:

- Task title
- Project
- Priority
- Description
- Estimated duration
- Deadline
- Schedule day
- Timeline position

The prototype uses this structure.

## Quick insert

Users should also be able to hover between timeline blocks and choose:

> - Add task here

The quick form should allow:

- task title
- duration
- priority

and optionally open the full task form.

This is intentionally optimized for quickly inserting unexpected work into an existing schedule.

---

# 13. Timeline insertion behavior

This is one of the most important product rules.

When a task is inserted before another task:

1. Insert the new task into the task order.
2. Recalculate the entire day's timeline.
3. Preserve the relative order of existing tasks.
4. Push affected tasks forward.
5. If the schedule exceeds daily capacity, mark the excess blocks as overflow.
6. Move overflow to the next available working day according to the scheduling rules.
7. Recalculate deadline risk.
8. Update all workload summaries.
9. Record an appropriate schedule-history event.

Example:

```text
Before

Task A   2h
Task B   2h
Task C   2h
Task D   2h
```

Insert:

```text
New Task   2h
```

before Task C.

Result:

```text
Task A      2h
Task B      2h
New Task    2h
Task C      2h
Task D      2h
```

If capacity is only 8h:

```text
Task A      2h
Task B      2h
New Task    2h
Task C      2h

Task D      → next available working day
```

---

# 14. Scheduling engine

The scheduling engine is the most important backend/domain component.

Do not duplicate scheduling calculations across UI components.

Create one authoritative scheduling service/domain module.

The scheduling engine must be responsible for:

- calculating daily task positions
- calculating start times
- calculating end times
- determining overflow
- determining available capacity
- moving overflow into future working days
- recalculating after task changes
- recalculating after working-capacity changes
- preserving task order
- calculating workload status

The current prototype has a centralized scheduling engine based on ordered blocks.

Preserve this architectural principle in the production implementation.

---

# 15. Overflow behavior

If scheduled work exceeds the user's capacity for a working day, the excess work becomes overflow.

Example:

```text
Capacity: 8h
Scheduled: 10h
Overflow: 2h
```

The user should see a clear warning:

> ⚠️ 2h overloaded — work will move to the next available working day.

Overflow items should clearly indicate:

- which task is affected
- how much time is overflowing
- destination day
- why it was moved

The prototype displays a dedicated overflow section below the timeline.

---

# 16. Next working day

The scheduler must understand working days.

By default:

```text
Monday → Friday
```

Weekends are not working days.

If a task overflows on Friday, it should move to the next available working day rather than Saturday.

The production implementation should centralize working-day calculation so that future working-calendar support can be added without rewriting the scheduler.

The prototype currently skips Saturday and Sunday when finding the next working day.

---

# 17. Manual task movement

Users should be able to manually move a scheduled task.

Supported interactions:

- Drag task before another task.
- Drag task after another task.
- Move task to another day.
- Explicitly move an overflow block to the next available working day.

After every manual move:

1. Update task/block ordering.
2. Recalculate the schedule.
3. Recalculate overflow.
4. Recalculate workload status.
5. Recalculate deadline risk.
6. Record schedule history.

The prototype supports drag-and-drop ordering and explicit next-day movement.

---

# 18. Task completion

Users can mark a task as completed.

When completed:

- status becomes `Completed`
- completed duration should reflect the task's estimated duration unless actual time tracking is implemented
- remaining duration becomes zero
- deadline risk should no longer mark it as at risk
- its scheduled blocks should be handled according to the application's completion rules
- newly available capacity should be reflected immediately

Do not introduce real-time stopwatch tracking unless explicitly requested.

The prototype currently provides a simple "Mark complete" action.

---

# 19. Task deletion

Users should be able to delete their tasks.

When a task is deleted:

1. Delete its schedule blocks.
2. Recalculate the affected days.
3. Recalculate workload.
4. Recalculate deadline risk.
5. Update the UI immediately.

Deleting a task should allow previously pushed work to fit back into the schedule.

The prototype already demonstrates this behavior.

---

# 20. Deadline risk calculation

The application must compare:

```text
Remaining task work
```

against:

```text
Available working capacity before the deadline
```

Example:

```text
Remaining work: 8h
Available capacity before deadline: 6h

Result:
At Risk
```

The risk calculation should consider:

- task remaining duration
- deadline
- user's daily capacity
- existing scheduled work
- working days
- current schedule

The prototype calculates available capacity across working days and excludes the task's own scheduled blocks from competing capacity.

---

# 21. Deadline statuses

Use three primary deadline states.

## On Track

There is enough available capacity to complete the task.

Example:

> On Track

## Tight Schedule

There is enough capacity, but very little spare capacity remains.

Example:

> Tight Schedule
> Only 1h of spare capacity remains before the deadline.

## At Risk

The remaining task work exceeds the available capacity before the deadline.

Example:

> At Risk
> This task needs 8h, but only 6h are available before the deadline.

Completed tasks should show:

> Complete

---

# 22. Important distinction: daily overload vs deadline risk

These are different concepts and must not be mixed.

### Daily overload

Example:

```text
Capacity: 8h
Scheduled: 10h

Daily overload: +2h
```

This tells the user that today's schedule does not fit.

### Deadline risk

Example:

```text
CRM
Remaining: 8h
Available before deadline: 6h

Deadline risk: At Risk
```

This tells the user that the task may not be completed before its deadline.

A day can be overloaded while all deadlines are still safe if there is sufficient future capacity.

A day can be within capacity while a task is at risk if the deadline is too close.

---

# 23. Calendar view

Calendar provides a high-level view of daily workload.

Each day should show:

- date
- scheduled hours
- daily capacity
- task/block count
- workload status
- capacity bar

Example:

```text
Mon
7h / 8h
On track

Tue
8h / 8h
At capacity

Wed
10h / 8h
Overloaded
```

Selecting a day should open that day's detailed timeline.

The prototype provides this day-level calendar view.

---

# 24. Weekly workload overview

The Overview screen should show workload across the week.

Example:

```text
Monday      7h / 8h    On track
Tuesday     8h / 8h    At capacity
Wednesday   9h / 8h    Tight
Thursday   10h / 8h    At risk
Friday      6h / 8h    On track
```

The purpose is to help the user see workload distribution rather than provide complicated analytics.

The prototype provides a weekly workload chart with daily capacity comparisons.

---

# 25. Tasks view

The Tasks view should provide a list of the user's tasks.

Recommended columns:

- Task
- Project
- Duration
- Deadline
- Status
- Schedule

Users should be able to open a task from the list.

Tasks should be ordered or filterable by relevant properties where appropriate.

The prototype provides this table structure.

---

# 26. Task detail panel

Clicking a task opens a right-side detail panel.

It should display:

### Basic information

- Project
- Task title
- Description

### Progress

- Estimated
- Completed
- Remaining

### Details

- Deadline
- Priority
- Status

### Schedule

- scheduled day
- scheduled time
- duration
- overflow state

### Deadline risk

Show the current risk state and explanation.

### Schedule history

Show meaningful schedule changes.

The prototype uses a right-side detail panel with these sections.

---

# 27. Admin — Team

The application includes an admin area.

The admin can view users/team members.

The Team screen should show:

- name
- role
- department
- daily capacity
- scheduled hours today
- workload status
- weekly workload indication

The admin should be able to add users.

The prototype currently provides a Team screen and Add Team Member modal.

---

# 28. Admin — User management

Admin should be able to create a user with:

- Full name
- Role/title
- Department
- Email
- Daily working capacity

The user's capacity is independent from other users.

Do not assume everyone works the same number of hours.

User management should not allow the admin to directly manipulate another user's detailed timeline unless explicitly requested.

The prototype intentionally treats other users' schedules as read-only from the admin view.

---

# 29. Admin — Projects

Admin should be able to create projects.

Project creation should support:

- project name
- optional description
- display color

Projects should become available immediately when creating tasks.

The prototype provides project creation and project details.

---

# 30. Project details

Project details should show:

- project name
- description
- task count
- total estimated hours
- completed hours
- completion percentage
- associated users
- project tasks

Example:

```text
CRM

12 tasks
42h estimated
28h completed

67% complete
```

Project information is intended for organization and workload visibility, not detailed project-management workflows.

The prototype provides this project-level summary.

---

# 31. Admin — Reports

Reports should provide lightweight organization-level visibility.

The admin reports should include:

## Team workload

Show:

- each team member
- today's scheduled hours
- daily capacity
- status
- weekly workload indicators

## Project progress

Show:

- project
- task count
- estimated hours
- completion percentage

## At-risk work

Show tasks whose deadline status is:

- Tight Schedule
- At Risk

The purpose is visibility, not performance evaluation.

The prototype currently contains these three report areas.

---

# 32. Admin limitations

The admin area should **not** include:

- task approval workflows
- manager approvals
- employee performance scoring
- employee surveillance
- automatic manager notifications
- approval requests
- timesheet approval
- payroll calculations

The product is a scheduling and workload-awareness system.

---

# 33. Settings

Users should be able to configure:

### Working start time

Example:

```text
09:00
```

### Daily working capacity

Example:

```text
8 hours
```

### Default task duration

Example:

```text
1 hour
```

When settings change, the schedule must be recalculated.

For example, changing:

```text
8h/day → 6h/day
```

may cause existing work to overflow into future working days.

The application must immediately recalculate the affected schedule and warnings.

The prototype explicitly recalculates the schedule after settings changes.

---

# 34. Data integrity rules

The scheduling engine must maintain these invariants:

- A task's duration must never become negative.
- A schedule block must reference an existing task.
- A task must not reference a deleted project.
- A user's schedule must only contain blocks belonging to that user.
- Calculated start/end times must always correspond to the current task order and duration.
- Overflow state must be recalculated rather than permanently trusted.
- Deadline status must be recalculated when schedule-affecting data changes.
- Daily capacity must never be assumed to be unlimited.
- Weekend days must not be treated as normal working days by default.

---

# 35. Recalculation triggers

The application must recalculate the schedule whenever any of these occur:

- task created
- task deleted
- task moved
- task duration changed
- task completed
- task reopened
- task deadline changed
- task inserted between existing tasks
- daily capacity changed
- working start time changed
- task moved to another day
- user capacity changed
- project/task assignment changes where scheduling is affected

After recalculation, update:

- timeline
- overflow
- capacity summary
- workload status
- deadline risk
- calendar
- weekly overview
- task schedule information

---

# 36. Server/client architecture

Keep the scheduling logic independent from UI rendering.

The UI should not contain duplicated scheduling calculations.

Recommended separation:

```text
UI
 ↓
Task/Schedule Actions
 ↓
Scheduling Domain Service
 ↓
Database
```

The scheduling engine should be testable without rendering React components.

Do not calculate critical schedule state only inside browser components.

The server must remain the authoritative source for persisted schedule state.

---

# 37. Authentication and authorization

The production application should support authenticated users.

Roles should include at minimum:

```text
Admin
User
```

### User

Can:

- manage their own tasks
- manage their own schedule
- view their own workload
- configure their own working capacity

### Admin

Can:

- manage users
- manage projects
- view team workload
- view project information
- view workload reports

Do not allow normal users to modify another user's schedule.

Do not expose admin functionality through client-side hiding alone. Authorization must be enforced server-side.

---

# 38. Persistence

The prototype currently keeps application state in JavaScript arrays for demonstration.

The production implementation must persist:

- users
- projects
- tasks
- schedule blocks
- working settings
- schedule history

Do not rely on browser memory as the production source of truth.

The database should be the authoritative persistent state.

---

# 39. Seed/demo data

The prototype uses realistic demonstration data involving:

- CRM
- Sales
- Meridian
- multiple team members
- historical completed tasks
- current tasks
- future tasks
- overloaded schedules

Use similar realistic seed data for development/demo environments.

The important demo scenario should demonstrate:

```text
CRM work
+
unexpected Proposal task
=
timeline shift
+
overflow
+
deadline warning
```

The prototype already includes a CRM-based live scheduling scenario and multiple users/projects.

---

# 40. Important prototype behavior to preserve

The following behaviors demonstrated in the prototype are considered core requirements:

### Insert between tasks

The timeline provides an explicit insertion point between task cards.

### Automatic recalculation

Tasks are recalculated based on ordered blocks.

### Overflow detection

Tasks that cannot fit within daily capacity become overflow.

### Automatic next-working-day calculation

The scheduler skips non-working days.

### Drag-and-drop ordering

Users can change task order directly on the timeline.

### Quick task insertion

Users can quickly add work between existing tasks.

### Deadline risk

Tasks are continuously evaluated against available capacity before their deadline.

### Schedule history

Important schedule movements are recorded.

---

# 41. What not to build

Do not add these unless explicitly requested:

- manager approval workflows
- task approval
- timesheet approval
- employee monitoring
- screenshots/activity monitoring
- payroll
- invoicing
- billing
- attendance tracking
- leave management
- HR management
- chat
- comments
- complex notifications
- email automation
- AI task assignment
- AI project planning
- automatic estimation
- external calendar synchronization
- Jira/Trello integrations
- customer/client portals
- complex resource allocation
- sprint management
- story points
- velocity tracking

WorkTime is fundamentally:

> **A time-aware task scheduling and workload visibility application.**

Keep the product focused.

---

# 42. Recommended project structure

Use clear domain boundaries.

A possible structure:

```text
src/
├── app/
│   ├── today/
│   ├── calendar/
│   ├── tasks/
│   ├── overview/
│   ├── settings/
│   ├── admin/
│   │   ├── team/
│   │   ├── projects/
│   │   └── reports/
│   └── api/
│
├── components/
│   ├── timeline/
│   ├── tasks/
│   ├── workload/
│   ├── projects/
│   ├── team/
│   └── ui/
│
├── features/
│   ├── scheduling/
│   ├── tasks/
│   ├── projects/
│   ├── users/
│   └── workload/
│
├── lib/
│   ├── scheduling/
│   ├── dates/
│   ├── validation/
│   └── auth/
│
└── db/
```

The exact structure should follow the existing repository conventions rather than being imposed blindly.

---

# 43. Scheduling domain module

Keep the scheduling engine in a dedicated module.

It should expose operations conceptually similar to:

```text
calculateDaySchedule()
recalculateSchedule()
calculateDailyCapacity()
calculateOverflow()
findNextWorkingDay()
calculateDeadlineRisk()
calculateWorkloadStatus()
insertTask()
moveTask()
removeTask()
```

Do not duplicate these calculations inside:

- timeline components
- dashboard components
- admin reports
- task tables

All surfaces should consume the same domain logic.

---

# 44. Performance considerations

The scheduler should remain predictable as the number of users, tasks, and days increases.

Avoid recalculating unrelated users' schedules when a user changes their own task.

For a task change:

1. Identify affected user.
2. Identify affected days.
3. Recalculate those schedules.
4. Recalculate deadline risk for affected tasks.
5. Update dependent summaries.

Do not run an entire organization's scheduling engine for every small UI interaction unless necessary.

---

# 45. Error handling

User-facing errors should be clear and actionable.

Examples:

```text
Unable to create task.
Please check the task duration and deadline.
```

```text
Unable to move this task.
Please try again.
```

```text
Schedule recalculation failed.
Your previous schedule has been preserved.
```

Never silently lose a user's schedule.

---

# 46. Acceptance criteria

The implementation is complete only when all of the following work:

### User setup

- User can configure working start time.
- User can configure daily working capacity.
- User can configure default task duration.
- Working end time is calculated correctly.

### Tasks

- User can create a task.
- User can assign it to a project.
- User can set duration.
- User can set deadline.
- User can set priority.
- User can edit task information.
- User can complete a task.
- User can delete a task.

### Timeline

- Tasks appear on the correct day.
- Tasks display correct calculated times.
- Tasks can be reordered.
- Tasks can be inserted between existing tasks.
- A new task shifts affected tasks.
- Schedule recalculates automatically.

### Overflow

- Daily capacity is enforced.
- Excess work is detected.
- Overflow is clearly displayed.
- Overflow moves to the next working day.
- Weekends are skipped by default.
- Removing work can allow overflow to return to an earlier day.

### Deadline risk

- Remaining work is calculated.
- Available capacity before deadline is calculated.
- On Track status works.
- Tight Schedule status works.
- At Risk status works.
- Deadline status updates after schedule changes.

### Overview

- Calendar shows daily workload.
- Weekly overview shows capacity vs scheduled work.
- Tasks list shows schedule information.
- Task detail shows schedule and deadline risk.

### Admin

- Admin can add users.
- Admin can view users.
- Admin can configure user capacity.
- Admin can add projects.
- Admin can view project progress.
- Admin can view team workload.
- Admin can view at-risk work.
- Normal users cannot modify other users' schedules.

---

# 47. Critical manual test scenario

Every scheduling implementation should manually test this exact scenario.

### Initial state

User capacity:

```text
8h/day
```

Existing tasks:

```text
CRM Development       4h
CRM Testing           2h
CRM Documentation     2h
```

Total:

```text
8h
```

Everything fits.

### Add unexpected task

Create:

```text
Proposal
Duration: 2h
Deadline: Today
```

Insert it before CRM Documentation.

Expected result:

```text
CRM Development       4h
CRM Testing           2h
Proposal              2h
CRM Documentation     2h → overflow
```

Expected warning:

```text
⚠️ 2h overloaded
```

Expected behavior:

```text
CRM Documentation
→ next available working day
```

The application should also recalculate the deadline status of affected tasks.

---

# 48. Second critical test

Start with:

```text
Today capacity: 8h
Today scheduled: 6h
Tomorrow scheduled: 6h
```

Add:

```text
New task: 4h
```

today.

Expected:

```text
Today:
8h scheduled

Tomorrow:
existing 6h
+ overflow 2h
= 8h
```

The scheduler should use available capacity on the next working day before pushing work further.

---

# 49. Third critical test

Change capacity:

```text
8h/day → 6h/day
```

Expected:

- existing schedule recalculates
- affected tasks overflow
- future schedule is updated
- workload indicators update
- deadline risk is recalculated

No stale schedule information should remain visible.

---

# 50. Final implementation principle

When in doubt:

> **Keep the product small, deterministic, and time-aware.**

The core value of WorkTime is not creating tasks.

The core value is answering:

> **"If I add this work, what happens to everything I already planned?"**

Every important feature should make that answer clearer.

The scheduling engine is the source of truth.

The timeline is the primary interface.

The workload indicators explain capacity.

The deadline warnings explain risk.

Admin features provide organization-level visibility.

Do not build beyond that unless the user explicitly requests it.
