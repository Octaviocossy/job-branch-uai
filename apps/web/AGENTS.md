# AGENTS.md — apps/web

JobBranch — a job application pipeline manager, built with Next.js 16 (App Router,
React 19), dev on `:3000`. TanStack Query + axios data layer against the NestJS API
(`apps/api`); React Hook Form + zod for forms. Consumes `@repo/models`.

## Structure

No `src/` folder — application code lives at the app root:

- `app/` — routes (layouts, pages, `providers.tsx`, `globals.css`, fonts).
- `config/`, `models/`, `utilities/`, `hooks/`, `services/`, `features/`,
  `components/`, `query/` — application code, one concern per folder.

The `@/*` alias maps to `./*` (see `tsconfig.json` and `vitest.config.ts`), so
`@/config`, `@/models`, `@/utilities/tailwind.utility`, `@/hooks/use-users`, etc.
resolve to these root-level folders.

## Architecture

**Read `.agents/rules/nextjs-api-workflow.md` before adding or changing hooks,
services, or API access.** It documents the full request flow (UI → hooks → services →
`api` utility → axios → `apps/api`), the `TResult`/`ApiError` contract, retry policy,
and base-URL configuration.

## Permission-aware UI

The menu, the action buttons and the routes show only what the signed-in Persona may do.
`config/permissions.config.ts` is the single static map: `ROUTE_PERMISSIONS` (route →
`codigoAccion`, dynamic segments as `[param]`), `ACTION_PERMISSIONS` (button → the
`codigoAccion` values it needs) and `NAV_ITEMS` (the sidebar). `hooks/use-permissions.ts`
(`usePermissions`) turns the `permisos` of `GET /auth/me` (`MeResponse`, read by `useSession`)
into `can(...codes)` and `canDo(action)`; `components/route-permission-guard.tsx` redirects a
route the Persona may not open. **When you add a screen, a button or an endpoint call, give it a
`codigoAccion` in that map and gate it with `usePermissions`.** The `codigoAccion` values are the
API's `Accion` catalog (`apps/api/src/modules/security/domain/catalogo-matriz.ts`; the
endpoint → code table is in `apps/api/README.md`). Hiding is UX, not security — the API checks
every request. The Administrador's matrix screen is `features/admin/`. A component test of a
gated control must sign in first (see `.agents/rules/testing-strategy.md`).

## Commands

Scoped to this app via Turborepo's `--filter` (run from the repo root):

- Dev: `pnpm --filter web dev`
- Build: `pnpm --filter web build`
- Lint: `pnpm --filter web lint`
- Type check: `pnpm --filter web check-types`
- Test: `pnpm --filter web test`

## Testing

`apps/web` uses two Vitest tiers — unit (`*.test.ts`, pure logic, no DOM) and
component/interaction (`*.test.tsx`, Testing Library + jsdom with the `services/` layer
mocked). Both run in the same jsdom config (`@repo/vitest-config/react`) via
`pnpm --filter web test`, and both are DB-free and headless/CI-safe. **Read
`.agents/rules/testing-strategy.md` before adding or changing any test file** — it covers
tier selection, what to mock per tier, the shared `test/test-utils.tsx` helper, the
schema-out-of-scope rule, and the Playwright opt-in (documented, not built).
