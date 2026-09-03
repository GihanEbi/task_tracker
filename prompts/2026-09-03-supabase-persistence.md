# Implementation prompt — Supabase persistence for WorkTime

## Goal

Replace the in-memory `WorkTimeStore` (seeded on every page load, lost on refresh) with real
persistence in Supabase (project `task_tracker`, `mcscegqyfgyolhtwboyl`), scoped per
Clerk-authenticated user, while keeping the existing client-side scheduling engine, timeline
UI, and interaction model completely unchanged. Per `AGENTS.md` §38, the database becomes the
authoritative source of persisted state; per §37, authorization is enforced server-side.

## Skills read

No skill matches this task (database schema design + Next.js Server Actions, not an
auth-flow or UI-integration task the `clerk-*` skills cover). `AGENTS.md` is the binding spec;
this prompt follows its required workflow (§3) and directly implements §38 (persistence) and
§37 (auth/authorization).

## Code inspected

- `lib/scheduling/types.ts`, `engine.ts`, `dates.ts`, `seed-data.ts`, `store.ts`, `context.tsx`
  — the full current architecture: a synchronous, client-only `WorkTimeStore` class holding
  `WorkTimeState` (settings/users/projects/tasks/blocks/history) in memory, mutated directly by
  ~9 methods (`createTaskAndInsert`, `moveBlockToNextDay`, `commitOrder`, `markComplete`,
  `deleteTask`, `saveSettings`, `resetSettings`, `addUser`, `addProject`), each calling
  `engine.recalcAll` and notifying a `useSyncExternalStore` subscriber. `CURRENT_USER_ID` is
  hardcoded to `"u1"` (Alex Chen) — there's no real link between the signed-in Clerk user and
  which seed user they "are".
- `proxy.ts` — Clerk middleware active on all routes; no route protection or role checks
  configured yet.
- `components/**` (18 components across timeline/modals/panels/admin/tasks/calendar/overview) —
  all consume `useWorkTime()` and call store methods directly and synchronously.
- `lib/supabase/client.ts`, `server.ts` (already created this session) — Clerk-session-aware
  Supabase clients (`useSupabaseClient()`, `createSupabaseServerClient()`) plus
  `createSupabaseAdminClient()` (secret key, bypasses RLS, server-only).
- Confirmed live: Supabase project reachable, keys valid, public schema currently empty (no
  tables).

## Decisions and assumptions

Both confirmed with the user directly:

1. **No RLS yet — Server Actions + explicit authorization checks.** Clerk is the only auth
   provider; there's no Clerk↔Supabase third-party-auth integration enabled (that's a manual
   step in both dashboards, outside what I can configure). All Supabase access from the app
   goes through Next.js Server Actions using `createSupabaseAdminClient()` (secret key), with
   every action independently checking the caller's Clerk user id and, where relevant, an
   `is_admin` flag before touching a row — satisfying §37 ("must be enforced server-side",
   "not through client-side hiding alone"). RLS can be layered in later as defense-in-depth;
   noted as a follow-up, not blocking.
2. **Full scope**: users, projects, tasks, schedule blocks, settings, and history all move to
   Supabase in this pass.
3. **Client store keeps its current shape and synchronous engine** (`engine.ts` untouched,
   still does instant client-side recalculation for a responsive UI). Every mutating
   `WorkTimeStore` method becomes: apply the change optimistically to local state (as today),
   fire the matching Server Action, and on failure roll back + toast an error ("Schedule
   recalculation failed. Your previous schedule has been preserved." per §45). This avoids
   rewriting the 18 UI components or the drag-and-drop/quick-insert interaction code — only
   `store.ts` and `context.tsx` change shape (methods become fire-and-forget wrappers around
   actions instead of pure local mutations).
4. **Server Actions independently recalculate before writing** — a client is never trusted to
   send pre-computed `overflow`/`start`/`end` values. Each action loads the affected user's
   current day(s) from Supabase, runs the same `engine.recalcAll` logic server-side (imported
   from `lib/scheduling/engine.ts`, which has no client-only dependencies), and persists the
   recalculated rows. This is what makes the server authoritative per §36.
5. **Identity bootstrapping**: `users.clerk_user_id` links a row to a real Clerk account
   (nullable — admin-added teammates may not have signed up yet). On first sign-in, if no
   `users` row has that Clerk id, one is auto-created (name/email from the Clerk profile,
   default capacity 8h, `is_admin = true` only if the `users` table is currently empty —
   bootstraps the first real sign-in as the admin; every subsequent sign-in defaults to
   `is_admin = false`). This replaces the hardcoded `CURRENT_USER_ID = "u1"`.
6. **Seed data becomes a one-time SQL seed script**, not code that runs on every store
   construction. It's applied once via `supabase db push`/SQL editor against the empty project,
   using the same demo users/projects/tasks/blocks from `seed-data.ts` — except the seeded
   "Alex Chen" row is left with `clerk_user_id = null` (nobody is Alex Chen until an admin
   claims/renames it, or it simply coexists as a demo teammate). The signed-in user gets their
   own auto-provisioned row per (5). This matches §39 ("use realistic seed data for
   development/demo") without conflating a demo person with whoever actually logs in.
7. **`role` naming collision avoided**: the existing `User.role` field (job title, e.g.
   "Software Engineer") stays `role` in the schema; the auth/authorization flag is named
   `is_admin` (boolean) to avoid confusion.
8. **`schedule_blocks."order"` stays numeric** (not integer) to preserve the existing
   insert-at-0.5-then-renormalize trick `createTaskAndInsert` uses today.
9. **`workEnd` is never persisted** — derived from `work_start + capacity` on every read/write,
   exactly as `engine.deriveWorkEnd` does today (§7: "Do not treat the calculated end time as
   an independently configurable value").
10. Teammates' non-block tasks (`assignedDay`, used for admin read-only workload views) persist
    as `tasks.assigned_day` with no corresponding `schedule_blocks` row, matching current
    behavior (§28: "admin view... read-only from other users' detailed timeline").

## Files expected to change

```
supabase/
  migrations/0001_init.sql     — new: schema (below)
  seed.sql                     — new: one-time demo data, ported from seed-data.ts

lib/scheduling/
  types.ts                     — add DB row types / id types (uuid strings), keep existing
                                  shape-facing types for the engine and UI unchanged
  engine.ts                    — unchanged (already has no client-only dependencies)
  dates.ts                     — unchanged
  seed-data.ts                 — removed (superseded by supabase/seed.sql); TODAY_DATE-based
                                  constants used elsewhere move to dates.ts if still needed
  store.ts                     — mutating methods become optimistic-update-then-server-action
                                  wrappers; constructor takes initial state (fetched
                                  server-side) instead of calling buildSeedData()
  context.tsx                  — WorkTimeProvider takes `initialState: WorkTimeState` prop
  actions.ts                   — new: all "use server" actions (auth check, recalculate,
                                  persist), one per current store mutation, plus
                                  loadWorkTimeState() for initial server-side fetch
  current-user.ts              — new: getOrCreateAppUser() — Clerk id -> users row,
                                  auto-provisioning + admin-bootstrap logic

app/layout.tsx                 — fetch initial state server-side (via actions.loadWorkTimeState),
                                  pass into WorkTimeProvider

lib/supabase/client.ts,server.ts  — unchanged (already created)
```

## Database schema (`supabase/migrations/0001_init.sql`)

```sql
create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique,
  name text not null,
  role text not null,
  department text not null,
  email text not null,
  capacity numeric not null default 8,
  color text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  project_id uuid not null references projects(id),
  description text not null default '',
  estimated_hours numeric not null default 0 check (estimated_hours >= 0),
  completed_hours numeric not null default 0 check (completed_hours >= 0),
  deadline date not null,
  priority text not null check (priority in ('High','Medium','Low')),
  status text not null check (status in ('Planned','In Progress','Completed')),
  user_id uuid not null references users(id),
  assigned_day date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_id_idx on tasks(user_id);
create index tasks_project_id_idx on tasks(project_id);

create table schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  day date not null,
  "order" numeric not null,
  duration numeric not null check (duration > 0),
  overflow boolean not null default false,
  start_minutes integer,
  end_minutes integer,
  label text,
  created_at timestamptz not null default now()
);
create index schedule_blocks_day_idx on schedule_blocks(day);
create index schedule_blocks_task_id_idx on schedule_blocks(task_id);

create table schedule_history (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references schedule_blocks(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  ts timestamptz not null default now(),
  text text not null,
  is_move boolean not null default false
);
create index schedule_history_task_id_idx on schedule_history(task_id);

create table user_settings (
  user_id uuid primary key references users(id) on delete cascade,
  work_start text not null default '09:00',
  capacity numeric not null default 8,
  default_slot integer not null default 60
);
```

RLS is left disabled on all tables for this pass (decision #1) — every table is only ever
touched through the secret-key admin client from Server Actions, which enforce authorization
in code.

## Functional requirements

Every store method gets a matching Server Action with the same contract as today, plus a
server-side authorization + recalculation step:

- `createTaskAndInsert` → insert task + block, recalc affected day, write back
  overflow/start/end for every block on that day, insert history rows for newly-overflowed/
  newly-fitted blocks.
- `moveBlockToNextDay` → recompute destination day via `nextWorkday`, update block's day/order,
  recalc both source and destination days, write history.
- `commitOrder` → update order for the given day's blocks, recalc, write history.
- `markComplete` / `deleteTask` → update/delete task (+ cascade blocks on delete), recalc
  affected day(s).
- `saveSettings` / `resetSettings` → update `user_settings`, recalc **every** day that has
  blocks for this user (capacity changes can overflow/un-overflow any day, per §49).
- `addUser` / `addProject` → **admin-only** (check `is_admin` on the caller's `users` row);
  reject with a clear error otherwise.
- All actions verify the target task/block/user row actually belongs to the calling Clerk
  user (via `users.clerk_user_id`) before mutating — a user can never modify another user's
  schedule (§37).

`loadWorkTimeState()` (called once, server-side, in `app/layout.tsx`) fetches: all users, all
projects, the signed-in user's own tasks + blocks + history, and every other user's tasks
filtered to `assigned_day is not null` (the read-only teammate view) — same data shape
`WorkTimeState` already has today, just sourced from Supabase instead of `buildSeedData()`.

## Scheduling behavior

Unchanged — `engine.ts` is reused verbatim on the server. The only new rule: **the server
recalculates from persisted state, never trusts client-sent overflow/start/end**, so a client
bug or tampered request can't corrupt another user's view of the schedule.

## Security considerations

- Secret key (`SUPABASE_SECRET_KEY`) is only ever imported in `lib/supabase/server.ts` (marked
  `server-only`) and only used inside files with a `"use server"` directive — never reaches the
  client bundle.
- Every Server Action re-derives the Clerk user id from `auth()` server-side; nothing trusts a
  `userId` passed from the client.
- Admin actions (`addUser`, `addProject`) check `is_admin` server-side; the admin UI routes
  remain visually reachable by anyone (no route-level gate exists yet) but the actions
  themselves reject non-admins — matches §37's "must be enforced server-side" but I'd recommend
  a follow-up to also gate `/admin/*` routes in `proxy.ts` so non-admins don't see the UI at
  all. Flagging as a suggested next step, not doing it in this pass unless you want it included.
- `.env.local` already gitignored; no secrets committed.

## Acceptance criteria

- `supabase/migrations/0001_init.sql` applied to the live project; `supabase/seed.sql` loads
  the demo data.
- Refreshing the browser preserves all tasks/blocks/settings — nothing resets to seed data.
- Signing in with a new Clerk account auto-creates a `users` row and that user starts with
  empty/default state (own tasks only), not Alex Chen's schedule.
- The three critical scenarios from `AGENTS.md` §47–49 (insert-causes-overflow,
  overflow-prefers-next-day-capacity, capacity-change-recalculates) all work exactly as before,
  now backed by real reads/writes, and survive a page refresh.
- A user cannot mutate another user's tasks/blocks/settings via the Server Actions (verified
  by inspecting each action's authorization check).
- `addUser`/`addProject` reject a non-admin caller.
- `npm run lint` and `npm run build` pass.

## Checks to run

- `npm run lint`
- `npm run build`
- Manual walkthrough (below) against the live Supabase project.

## Manual test steps

1. Apply the migration + seed SQL to the Supabase project; confirm tables/rows exist via the
   Supabase dashboard.
2. Sign in with your Clerk account — confirm a new `users` row is created with
   `is_admin = true` (first real user), default empty schedule.
3. Add a task on Today, refresh the page — task and its block are still there.
4. Repeat the §47 overflow scenario (insert 2h "Proposal" before a full day's last block) —
   confirm overflow + toast + history entry, then refresh — state matches pre-refresh exactly.
5. Change capacity 8→6 in Settings, confirm overflow recalculates and persists across refresh.
6. Open a second browser (or incognito) and sign in with a different Clerk account — confirm
   it sees its own empty schedule, not the first account's tasks, and cannot see/edit the first
   account's blocks.
7. From the second (non-admin) account, attempt to add a project — confirm it's rejected.
8. Delete a task that had overflowed a later block — confirm the later block un-overflows and
   a "fits back into" history entry is recorded, and this persists across refresh.
