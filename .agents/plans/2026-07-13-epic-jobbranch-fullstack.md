# Plan: Epic — JobBranch full-stack (v0 prototype → apps/web + apps/api)

> Status: **completed**
> Created: 2026-07-13
> Updated: 2026-07-13
> Issue: #1
> Integration branch: epic/1-jobbranch-fullstack
> Epic PR: #11 (epic/1-jobbranch-fullstack → main)

## Goal

Build JobBranch as a full-stack app: implement the v0 visual prototype (`apps/v0-prototype/`)
as production screens in `apps/web`, backed by a real NestJS API (`apps/api`), with the domain
contract shared through `@repo/models` (Zod). Follow `SPEC.md`, the api hexagonal use-case rule,
and the web data-layer rule. The models/persistence foundation also resets
`.agents/ubiquitous-language.md`.

## Scope decisions (agreed with owner)

- **Backend:** full-stack for all 6 prototype areas (auth, CV profiles, branches, analytics,
  follow-up, feedback).
- **Auth (RF14):** native register/login (BCrypt+salt), signed JWT + session guard, role at
  signup. **OAuth deferred.**
- **Security (RF15):** permission matrix **ships** (#10) — home of the mandatory patterns.
- **CV storage (RF01/BR-6):** Postgres `bytea` blob on `VersionPerfil`, ≤ 10 MB.

## Mandatory design patterns

Both required at least once; implemented + unit-tested in **#10 (Security)**:
- **Composite** — `ComponentePermiso` → `GrupoPermisos` (composite) / `Accion` (leaf), traversed
  by `evaluar()` (RF15).
- **Factory** — `MatrizPermisosFactory` builds the per-role Composite permission tree (CU15).

## Children & Waves

| Wave | Issue | Branch | Title | Status |
|------|-------|--------|-------|--------|
| 1 | #2 | `2-foundation-models-and-persistence` | Foundation — `@repo/models` schemas + API persistence (Drizzle + seed + module stubs) + glossary reset | done |
| 1 | #3 | `3-foundation-web-shell` | Foundation — web design system, app shell & data-layer conventions | done |
| 2 | #4 | `4-auth-identity` | Auth & identity (full-stack) — register/login, BCrypt, JWT, role | done |
| 2 | #5 | `5-branches-backend` | Branch management backend — rama/vacante/empresa/hito/feedback module | done |
| 2 | #6 | `6-cv-profiles` | CV profiles (full-stack) — VersionPerfil module (blob) + profiles screen | done |
| 2 | #7 | `7-analytics` | Analytics (full-stack) — metrics endpoints + analytics screen | done |
| 2 | #8 | `8-followup` | Follow-up / anti-ghosting (full-stack) — reminders module + follow-up screen | done |
| 3 | #9 | `9-branches-dashboard-frontend` | Branches & dashboard frontend — /branches, /branches/[id], / wired to the API | done |
| 3 | #10 | `10-security-permission-matrix` | Security — permission matrix (Composite + Factory, mandatory patterns) [RF15] | done |

## Dependency Edges

```
4 -> 2
4 -> 3
5 -> 2
6 -> 2
6 -> 3
7 -> 2
7 -> 3
8 -> 2
8 -> 3
9 -> 5
9 -> 3
10 -> 2
10 -> 4
```

## Architecture Decisions

- **`@repo/models` is the single contract** — `apps/api` validates with it (`ZodValidationPipe`)
  and mirrors it in Drizzle tables; `apps/web` consumes it through the `TResult`/hook/service
  layer against `NEXT_PUBLIC_API_URL`.
- **Foundation pre-scaffolds everything shared** — all Drizzle tables + one migration + a seed
  (ported prototype data) + empty NestJS feature-module stubs registered in `app.module.ts`. So
  wave-2 slices only fill their own module and add their own screen — no shared-file merge
  conflicts (`app.module.ts`, `schema/index.ts`, migrations are written once, in #2).
- **JWT guard in `shared/auth/` (foundation), token issuance in #4** — features depend only on
  the foundation for `@UseGuards(JwtAuthGuard)`, decoupling them from the auth slice at build time.
- **Analytics/Follow-up own read repositories** over the pipeline tables, so they are wave-2
  peers of the branches backend (#5), not dependents.
- **Denormalize in read adapters** — normalized FK tables (rama→vacante→empresa) stay correct
  while read use-cases return the flat `Application` shape the prototype/frontend expects.
- **Branches split BE (#5, wave 2) / FE (#9, wave 3)** — the branches domain is the largest
  (5 entities + 3 screens); splitting keeps each slice a sane size. Dashboard folds into #9
  (shares the applications data layer).

## Runner / verification notes

- Backend acceptance in headless/parallel runs = `pnpm --filter api lint && check-types && build
  && test` (unit tier only). The `*.int.spec.ts` / `*.e2e-spec.ts` tiers need the `postgres-test`
  container — run them **locally**, not as headless gates.
- `@repo/models` schema tests are the canonical schema-test home (`pnpm --filter @repo/models test`).
- Web acceptance = `pnpm --filter web lint && check-types && build && test`.
- Local end-to-end demo needs: `pnpm --filter api db:up` → `db:migrate` → `db:seed`, then
  `pnpm --filter api dev` + `pnpm --filter web dev`, logging in as the seeded demo user.
