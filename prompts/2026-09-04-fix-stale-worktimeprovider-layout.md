# Implementation prompt — Fix stale WorkTimeProvider after sign-in

## Goal

Fix the runtime error `useWorkTime must be used within a WorkTimeProvider`, thrown from
`TasksView` (and reproducible on any protected page), by removing the root layout's stale
auth-gated conditional around `AppShell`.

## Skills read

None apply — this is a Next.js App Router routing/layout structure issue, not Clerk config or
Supabase schema.

## Code inspected

- `app/layout.tsx` — root layout calls `auth()` once and does
  `initialState ? <AppShell initialState={initialState}>{children}</AppShell> : children`.
  This is the *only* place `WorkTimeProvider` gets mounted.
- `components/layout/AppShell.tsx` — wraps `children` in `WorkTimeProvider`, renders
  `Sidebar` + overlays.
- `lib/scheduling/context.tsx` — `useWorkTime()` throws if no `WorkTimeProvider` ancestor.
- `proxy.ts` (this Next version's renamed `middleware.ts`) — `clerkMiddleware` already calls
  `auth.protect()` on every route except `/`, `/sign-in(.*)`, `/sign-up(.*)`. So by the time a
  request for `/tasks`, `/today`, etc. reaches the server, the user is guaranteed authenticated —
  the root layout's own `auth()` check is redundant.
- `app/sign-in/[[...sign-in]]/page.tsx` — plain `<SignIn />`, default redirect behavior, i.e. a
  client-side transition after auth completes.
- `app/page.tsx`, `app/admin/*/page.tsx` — existing precedent for page-level
  `getOrCreateAppUser()` + `redirect()` guards.
- Route list: `app/{today,calendar,tasks,overview,settings}/page.tsx`,
  `app/admin/{team,projects,reports}/page.tsx`.

## Root cause

The root layout is shared by literally every route. The Next.js App Router does not re-execute a
shared layout segment on every client-side navigation — it reuses the previously rendered output
for segments that are already part of the current route tree. If the very first render in a
session happened while signed out, `initialState` was `null` and `children` rendered raw (no
`AppShell`/`WorkTimeProvider`). A subsequent *client-side* navigation into a protected route
(e.g. Clerk's `<SignIn />` redirecting via `router.push` after successful auth, then the user
clicking a nav link) does not force the root layout to re-run, so the stale, unwrapped shell
persists — any client component under it calling `useWorkTime()` throws.

`proxy.ts` already guarantees auth for every non-public route at the request level, so this
doesn't need re-checking in the root layout at all. Deciding it there is exactly what makes it
go stale.

## Decisions & assumptions

- **Move the `AppShell`/`WorkTimeProvider` mount into a route-group layout**,
  `app/(app)/layout.tsx`, covering `today/`, `calendar/`, `tasks/`, `overview/`, `settings/`,
  `admin/`. Route groups (`(app)`) don't affect URLs. Crossing from a public segment (`/`,
  `/sign-in`, `/sign-up`) into the `(app)` group segment is a genuinely new part of the route
  tree from the router's perspective, so it always mounts fresh — it can't carry stale state the
  way the root layout does.
- Since `proxy.ts` already enforces `auth.protect()` on everything in this group, the new group
  layout calls `loadWorkTimeState()` unconditionally (no `initialState ? ... : ...` branch) —
  removes the possibility of ever reaching `AppShell` without a valid `initialState` in the first
  place.
- Root layout (`app/layout.tsx`) keeps only `html`/`body`, fonts, and `ClerkProvider`, rendering
  `children` directly. `/`, `/sign-in`, `/sign-up` stay outside `(app)` and are unaffected.
- Not touching `proxy.ts` — its matcher operates on URL paths, which the `(app)` route group
  doesn't change.
- Not adding any new auth check inside the group layout beyond what `loadWorkTimeState()` /
  `getOrCreateAppUser()` already does — `auth.protect()` in middleware is the enforcement point.

## Files expected to change

- `app/layout.tsx` — strip the `auth()`/`initialState`/`AppShell` logic down to
  html/body/fonts/`ClerkProvider`.
- `app/(app)/layout.tsx` — **new**. Calls `loadWorkTimeState()`, renders
  `<AppShell initialState={initialState}>{children}</AppShell>`.
- Move (no content changes) into `app/(app)/`:
  - `app/today/page.tsx` → `app/(app)/today/page.tsx`
  - `app/calendar/page.tsx` → `app/(app)/calendar/page.tsx`
  - `app/tasks/page.tsx` → `app/(app)/tasks/page.tsx`
  - `app/overview/page.tsx` → `app/(app)/overview/page.tsx`
  - `app/settings/page.tsx` → `app/(app)/settings/page.tsx`
  - `app/admin/team/page.tsx` → `app/(app)/admin/team/page.tsx`
  - `app/admin/projects/page.tsx` → `app/(app)/admin/projects/page.tsx`
  - `app/admin/reports/page.tsx` → `app/(app)/admin/reports/page.tsx`
- `app/page.tsx`, `app/sign-in/[[...sign-in]]/page.tsx`, `app/sign-up/[[...sign-up]]/page.tsx`
  — unchanged, stay directly under `app/`.

## Functional requirements

- Visiting any protected route (`/today`, `/calendar`, `/tasks`, `/overview`, `/settings`,
  `/admin/*`) while signed in always renders inside `WorkTimeProvider` — no client-navigation
  path can reach it unwrapped.
- Signing in via `<SignIn />` and being redirected into the app renders correctly on the first
  transition, with no manual page refresh required.
- URLs are unchanged (`(app)` is a route group, not a path segment).
- `/`, `/sign-in`, `/sign-up` continue to render without `AppShell`/`WorkTimeProvider`, as today.

## Scheduling behavior

None — pure routing/layout restructuring, no change to scheduling engine, actions, or state
shape.

## Security considerations

- No change to enforcement: `proxy.ts`'s `auth.protect()` remains the sole gate for protected
  routes; admin pages keep their existing server-side `redirect("/today")` guards.
- Removing the layout-level `auth()` branch does not weaken anything, since it was never the
  actual enforcement mechanism (a signed-out user hitting any of these routes is already
  redirected by middleware before the layout runs).

## Acceptance criteria

- [ ] Fresh incognito session: visit `/tasks` directly while signed out → redirected to
      `/sign-in` (unchanged behavior, confirms middleware still gates the group).
- [ ] Sign in from `/sign-in` → land on `/today` (or wherever Clerk redirects) with the app shell
      (sidebar, etc.) visible, no console error.
- [ ] From the freshly-signed-in session, client-navigate to `/tasks` via the sidebar → renders
      the tasks table, no `useWorkTime` error.
- [ ] Full page reload on `/tasks` while signed in → still renders correctly.
- [ ] `/`, `/sign-in`, `/sign-up` render as before (landing page / Clerk forms, no sidebar).
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` all pass.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`

## Manual test steps

1. `npm run dev`, open an incognito window, go directly to `http://localhost:3000/tasks` →
   confirm redirect to `/sign-in`.
2. Sign in → confirm you land in the app with sidebar/shell visible and no runtime error overlay.
3. Click "Tasks" in the sidebar → confirm the tasks table renders.
4. Hard-refresh on `/tasks` → confirm it still renders correctly.
5. Sign out → confirm `/` shows the landing page, `/tasks` redirects to `/sign-in` again.
