# AGENTS.md — apps/api

NestJS 11 API, REST under its own routes, dev on `:3001`, Postgres via Drizzle, request/response
contracts shared from `@repo/models` (Zod).

## Architecture

This app uses a use-case (hexagonal) layout: `presentation/` → `application/use-cases/` →
`domain/` (repository port) ⇠ `infrastructure/` (repository implementation). **Read
`.agents/rules/use-case-based-architecture.md` before adding or changing controllers, use
cases, or repositories.**

## Commands

Run from the repo root, scoped with `--filter api`:

- Dev: `pnpm --filter api dev`
- Build: `pnpm --filter api build`
- Lint: `pnpm --filter api lint`
- Type check: `pnpm --filter api check-types`
- Test (unit, no DB): `pnpm --filter api test` (Vitest)
- Test (adapter integration): `pnpm --filter api test:int`
- Test (e2e): `pnpm --filter api test:e2e`
- Test (both DB tiers): `pnpm --filter api test:db`
- Drizzle: `pnpm --filter api db:generate`, `pnpm --filter api db:migrate`, `pnpm --filter api db:studio`
- Database container (app-scoped Postgres, `apps/api/docker-compose.yml`): `pnpm --filter api db:up` (start), `pnpm --filter api db:down` (stop), `pnpm --filter api db:logs` (follow logs), `pnpm --filter api db:reset` (stop + wipe volume). The API itself runs on the host via `pnpm --filter api dev`; for the full containerized stack use the root `docker-compose.yml` / root `docker:*` scripts.
- Test database container (`postgres-test` service, same compose file): `pnpm --filter api db:test:up` (start), `pnpm --filter api db:test:down` (stop), `pnpm --filter api db:test:migrate` (apply `apps/api/drizzle/*.sql` against `.env.test`'s `DATABASE_URL`).

## Testing

`apps/api` splits Vitest into three tiers — unit (`*.spec.ts`, no DB), adapter integration
(`*.int.spec.ts`, real Drizzle vs a dedicated test Postgres), and e2e (`*.e2e-spec.ts`, full
`AppModule` over HTTP via `supertest`). **Read
`.agents/rules/testing-strategy.md` before adding or changing any test file** — it covers tier
selection, the `.env.test` / `postgres-test` contract, and the shared `test/setup/` helpers.
Only the unit tier is DB-free; do not add the DB tiers to headless/parallel-runner agent flows.

## Domain

Domain types (e.g. `User`, `CreateUserInput`) come from `@repo/models`, the shared Zod-schema
package. The Drizzle `users` table in `apps/api/src/database/schema/` mirrors that schema's
shape. See `.agents/ubiquitous-language.md` (repo root) for the canonical entity definitions
and their aliases-to-avoid.

Feature modules live under `src/modules/`, one per bounded concern — `users`, `persona`
(the `Persona`/`Recruiter`/`Postulante` actor hierarchy, composing `User` via `usuario_id`),
`auth`, `cv-versions`, `branches`, `analytics`, `followup`, `security`, `health`.
`modules/persona/` follows the same use-case layout as every other module
(`domain/persona.ts`, `persona.repository.ts`, `create-persona.use-case.ts`,
`drizzle-persona.repository.ts`, `persona.module.ts`).
