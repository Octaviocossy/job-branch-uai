# Plan: Epic — Post-MVP web UX fixes + auth guard + full seeder

> Status: **completed**
> Created: 2026-07-13
> Updated: 2026-07-13
> Issue: #12
> Integration branch: epic/12-fixes-auth-ux-seeder

## Goal

Fix four independent gaps from the epic #1 MVP: dead "Nueva Versión"/"Nueva Rama" create
buttons, no route protection (unauthenticated users reach the dashboard), a hardcoded sidebar
user + orphan Settings link + non-clearing logout, and a partial/non-idempotent seeder.

## Children & Waves

| Wave | Issue | Branch | Title | Status |
|------|-------|--------|-------|--------|
| 1 | #13 | `13-wire-create-buttons` | feat: wire "Nueva Versión" & "Nueva Rama" create buttons | merged |
| 1 | #14 | `14-auth-route-guard` | feat: auth route guard + auto-redirect (login default) | merged |
| 1 | #15 | `15-sidebar-user-identity` | feat: sidebar real user identity, remove Settings, logout | merged |
| 1 | #16 | `16-full-db-seeder` | feat: full database seeder mirroring current data | merged |

All 4 children integrated into `epic/12-fixes-auth-ux-seeder` with zero conflicts. Epic PR: #17.

## Dependency Edges

```
# none — all four slices are file-disjoint and independent (single wave, fully parallel)
```

## Notes (per-slice scope)

- **#13** (`apps/web`): new `use-create-cv-version.ts` / `use-create-application.ts` hooks + two
  dialogs (`create-cv-version-dialog.tsx`, `create-branch-dialog.tsx`); wire buttons in
  `profiles-view.tsx` and `branches-view.tsx`. Reuses existing unused `*_service.create` methods.
- **#14** (`apps/web`): client-side `AuthGuard` / `GuestGuard` (token is in localStorage → no
  server middleware possible); wrap `(dashboard)/layout.tsx` and `(auth)/layout.tsx`; add 401 →
  `/signin` redirect in `axios.config.ts`.
- **#15** (`apps/web` + `apps/api` + `@repo/models`): extend `GET /auth/me` to return the full
  `User` (add `meResponseSchema`); `use-session.ts` hook; sidebar renders real user, drops the
  `/settings` link, and makes "Cerrar sesión" call `clearAuthToken()`.
- **#16** (`apps/api`): make `seed.ts` idempotent (reset-then-seed) and add the missing
  `feedback` + `recordatorios` tables while preserving the existing dataset verbatim.

## File-disjointness check (why no edges)

- #13 → `features/profiles/*`, `features/branches/*`, `hooks/use-create-*.ts`
- #14 → `app/(dashboard)/layout.tsx`, `app/(auth)/layout.tsx`, `components/auth-guard.tsx`,
  `components/guest-guard.tsx`, `config/axios.config.ts`
- #15 → `components/sidebar.tsx`, `services/auth.service.ts`, `hooks/use-session.ts`,
  `packages/models/src/schemas/auth.schema.ts`, `apps/api/src/modules/auth/**`
- #16 → `apps/api/src/database/seed.ts`

No path appears in two slices → safe to run and auto-merge in parallel.
