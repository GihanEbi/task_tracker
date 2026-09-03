# Implementation prompt — Admin role visibility & management

## Goal

1. Only show the admin surfaces (Team, Projects, Reports — nav items and pages) to users whose `users.is_admin` is `true`. Currently these render for every signed-in user.
2. Let an admin grant/revoke admin access to other team members from the Team section.

## Skills read

None of the installed skills (Clerk, Supabase) directly govern this change — it's plain Server Action + RLS-bypassing admin-client work already established in the codebase. Re-read `AGENTS.md` in full, especially §5 (admin workspace), §27–28 (admin/team, user management), §37 (auth/authorization — "Do not expose admin functionality through client-side hiding alone"), §41 (what not to build — no approval workflows, no HR/perf features).

## Code inspected

- `lib/scheduling/types.ts` — `User` has no `isAdmin` field.
- `lib/scheduling/actions.ts` — `mapUserRow`/`UserRow` don't read `is_admin` even though `loadWorkTimeState` does `select("*")`. `requireAdmin()` helper exists (throws if `!appUser.isAdmin`), used by `addUserAction`/`addProjectAction`. No existing "update user" action.
- `lib/scheduling/current-user.ts` — `getOrCreateAppUser()` already resolves `isAdmin` server-side from Clerk → `users` row; first-ever signup becomes admin.
- `lib/scheduling/store.ts` — client store; `addUser`/`addProject` show the `runOptimistic(mutate, actionPromise, errorMsg)` pattern to follow.
- `components/layout/Sidebar.tsx` — `NAV_ITEMS` and `ADMIN_NAV_ITEMS` both render unconditionally (lines 124-137); no `isAdmin` check anywhere.
- `app/admin/team/page.tsx`, `app/admin/projects/page.tsx`, `app/admin/reports/page.tsx` — thin server components with zero auth checks, just render the client view.
- `app/layout.tsx` — calls `loadWorkTimeState()` once for the signed-in user, passed as `initialState` into `AppShell`/`WorkTimeProvider`. `WorkTimeState.currentUserId` is just an id; the current user's full record (incl. admin flag) is available via `users.find(u => u.id === currentUserId)`.
- `components/admin/TeamView.tsx` — grid of `user-card` buttons opening `UserDetailPanel`; no existing per-user action buttons besides "+ Add user".
- `components/panels/UserDetailPanel.tsx` — right-side detail panel; `detail-foot` section currently just shows a read-only/own-schedule note — natural place for a "Make admin" / "Remove admin" button.
- `supabase/migrations/0001_init.sql` — `users.is_admin boolean not null default false` already exists. **No migration needed.**

## Decisions & assumptions

- **No new field for "am I admin"** — reuse `users` array + `currentUserId` already in `WorkTimeState`; add `isAdmin` to the shared `User` type and derive `store.userById(currentUserId)?.isAdmin` wherever needed (sidebar, team view, panel). Keeps the state shape minimal, consistent with how the rest of the store works.
- **Server-side page guard, not just client-side hiding** — per AGENTS.md §37, `app/admin/*/page.tsx` will call `getOrCreateAppUser()` and `redirect("/today")` (via `next/navigation`) for non-admins, in addition to hiding the nav links. This closes the direct-URL-navigation gap that exists today for every signed-in user.
- **New Server Action `setUserAdminAction(userId, isAdmin)`** in `actions.ts`, guarded by the existing `requireAdmin()` helper — mirrors `addUserAction`/`addProjectAction` conventions (no zod, plain thrown `Error`, service-role Supabase client).
- **Block self-demotion**: the action throws if `userId === appUser.id` when `isAdmin` is `false`. Rationale: `requireAdmin()` guarantees the *caller* is an admin; blocking self-demotion guarantees at least one admin always remains reachable, with no extra "last admin" counting logic needed. Self-*promotion* is a no-op in practice (you're already admin) but isn't specially blocked — not worth the extra branch.
- **New users are still created as non-admin** (`addUserAction` unchanged) — granting admin is a deliberate, separate action taken from the Team view after the user exists, not a checkbox on the Add User modal. Matches AGENTS.md §28 ("admin should not directly manipulate another user's detailed timeline unless explicitly requested") in spirit — this feature only touches the `is_admin` flag, nothing else about the target user.
- **UI placement**: add the "Make admin" / "Remove admin" button to `UserDetailPanel`'s `detail-foot`, visible only when the *viewing* user is admin and the *viewed* user isn't themselves. Also add a small "Admin" badge next to the role/department line in both the Team grid card and the detail panel header, so admin status is visible at a glance (read-only for non-admin viewers).
- Not doing: a roles/permissions table, audit log of admin grants, or a confirmation modal for the toggle (existing patterns like "Mark complete" and delete are single-click with toast feedback, no confirm step — staying consistent).

## Files expected to change

- `lib/scheduling/types.ts` — add `isAdmin: boolean` to `User`.
- `lib/scheduling/actions.ts` — add `is_admin` to `UserRow`/`mapUserRow`; add `setUserAdminAction`.
- `lib/scheduling/store.ts` — add `setUserAdmin(userId, isAdmin)` method.
- `components/layout/Sidebar.tsx` — only render the "Admin" divider + `ADMIN_NAV_ITEMS` when the current user is admin.
- `app/admin/team/page.tsx`, `app/admin/projects/page.tsx`, `app/admin/reports/page.tsx` — server-side redirect non-admins to `/today`.
- `components/admin/TeamView.tsx` — show an "Admin" badge on admin users' cards.
- `components/panels/UserDetailPanel.tsx` — show "Admin" badge; add the make/remove-admin button + optimistic call.

## Functional requirements

- A non-admin signed-in user sees no "Admin" nav section and no Team/Projects/Reports links.
- A non-admin who navigates directly to `/admin/team`, `/admin/projects`, or `/admin/reports` is redirected to `/today` server-side (not just hidden client-side).
- An admin sees the Admin nav section and all three pages as today.
- In Team, an admin sees a "Make admin" button on every other user's detail panel (not their own), and "Remove admin" on other users who are already admins.
- Clicking the button optimistically flips the badge/state and shows a toast; on server rejection it rolls back with an error toast (matching `runOptimistic` behavior elsewhere).
- A user's own admin status can't be revoked through this control (no self-demotion button shown, and the server action rejects it defensively too).

## Scheduling behavior

None — this feature does not touch tasks, blocks, capacity, or deadlines. No recalculation triggers apply.

## Security considerations

- Authorization enforced server-side in `setUserAdminAction` via `requireAdmin()` (existing helper), not just by hiding the button.
- Admin page routes (`/admin/team`, `/admin/projects`, `/admin/reports`) gated server-side, closing the current gap where any signed-in user can reach them by URL.
- Self-demotion blocked server-side, guaranteeing at least one admin always exists (since the actor calling the action is themselves an admin, by `requireAdmin()`).
- No new data exposure: `is_admin` was already readable by any authenticated user indirectly (RLS is fully locked down; all reads go through the service-role client already), this just surfaces it in the typed `User` the client already receives in full for every teammate.

## Acceptance criteria

- [ ] Signed in as a non-admin seed user: sidebar shows no Admin section; visiting `/admin/team` redirects to `/today`.
- [ ] Signed in as an admin: sidebar shows Admin section; Team/Projects/Reports load normally.
- [ ] From Team → open a non-admin teammate's detail panel → "Make admin" button appears (admin viewer only) → clicking it shows the "Admin" badge and a success toast, persists across reload.
- [ ] Open an admin teammate's detail panel → "Remove admin" appears instead → clicking it removes the badge, persists across reload.
- [ ] Open your own detail panel → no make/remove-admin button shown.
- [ ] A non-admin user has no way (UI or direct action call) to change anyone's admin flag — action throws "Only admins can do this."
- [ ] `npx tsc --noEmit` and `npm run lint` (or repo's existing scripts) pass.

## Checks to run

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build` (Next.js will fail-fast on server/client boundary mistakes)

## Manual test steps

1. `npm run dev`, sign in as the first (admin) seed user. Confirm Admin nav visible, Team/Projects/Reports load.
2. Open Team → click a non-admin teammate → click "Make admin" → confirm badge appears + toast, refresh page, confirm it persisted (re-fetch from DB).
3. Sign out, sign in as that now-admin teammate (or use Clerk impersonation) → confirm they now see the Admin nav section.
4. Sign in as a still-non-admin user → confirm no Admin nav section, and manually visiting `/admin/team` redirects to `/today`.
5. As an admin, open your own detail panel → confirm no admin-toggle button is present.
6. As an admin, remove admin from the teammate granted in step 2 → confirm badge disappears, they lose Admin nav on next load.
