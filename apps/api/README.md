# apps/api

NestJS 11 REST API — use-case/hexagonal architecture, Postgres via Drizzle, request/response contracts shared from `@repo/models` (Zod).

## Overview

`api` is the backend of the [monorepo](../../README.md): a NestJS 11 REST API that runs on `:3001` in development. It validates every request against the shared Zod schemas from [`@repo/models`](../../packages/models) via a `ZodValidationPipe`, persists domain entities to Postgres through [Drizzle ORM](https://orm.drizzle.team), and emits in-process domain events (`@nestjs/event-emitter`) after persistence. It consumes `@repo/models` for its domain contracts and never depends on `apps/web` — the web app reaches it only over HTTP.

Current surface: the job-search resources (`branches`, `cv-versions`, `analytics`, `followup`), identity and access (`auth`, `users`, `persona`, `security`) and a `health` liveness probe (`GET /health`, which pings the database). Every endpoint except register, login and health needs a live `Sesion` and carries its own `Accion` — see [Modules](#modules) and [Endpoints and their Acciones](#endpoints-and-their-acciones).

## Tech stack

| Area | Tools |
|------|-------|
| Framework | [NestJS](https://nestjs.com) `11` (`@nestjs/common`/`core`/`platform-express`) |
| Language | TypeScript `5.9` — `NodeNext` resolution, **CommonJS** output (no `"type": "module"`) |
| Persistence | [Drizzle ORM](https://orm.drizzle.team) `0.45` + Postgres `17` (`pg`), migrations via `drizzle-kit` |
| Validation | [Zod](https://zod.dev) `4` + [`@repo/models`](../../packages/models) (shared schemas ⇒ one source of truth for shape) |
| Events | `@nestjs/event-emitter` `3` (in-process domain events) |
| Config | `@nestjs/config` (validated env, see `src/config/env.validation.ts`) |
| Testing | [Vitest](https://vitest.dev) `4` + [`supertest`](https://github.com/ladjs/supertest) (3-tier split; see [Testing](#testing)) |
| Lint | [Biome](https://biomejs.dev) (single root config) |

## Architecture

The app is organized around **use cases** (one business action per class), not resources or MVC layers. HTTP, business logic, and persistence are kept in separate folders so each can change independently:

```
presentation/            application/use-cases/       domain/                  infrastructure/
Controller             → Use case (one execute()    → Repository port        ⇠ Drizzle repository
+ ZodValidationPipe      per action)                   (interface + DI token)   (implements the port)
```

Data flows one way — `presentation → application → domain (port)` — and `infrastructure` is plugged into the port from the outside via Nest's DI container (`{ provide: LISTA_USUARIOS, useClass: DrizzleListaUsuarios }`). A use case never imports from `infrastructure/` or `presentation/`, and only the infrastructure layer touches Drizzle/SQL.

Two cross-cutting rules are **mandatory**:

- **Logging** — every use case injects the shared `AppLogger` (`shared/logger/`, a transient-scoped `ConsoleLogger` subclass) and sets its context to the class name; no `console.*`.
- **Events** — an action with observers emits a **typed domain event** after persistence instead of calling the side-effect inline. `user.created` is the reference: `RegisterUseCase` emits `USER_CREATED_EVENT` after `ListaUsuarios.agregarUsuario` persists the `Usuario`, and `UserCreatedListener` (`@OnEvent`) reacts.

This is a summary — see [`.agents/rules/use-case-based-architecture.md`](.agents/rules/use-case-based-architecture.md) for the full rule (naming conventions, responsibilities table, validation/DTO policy, and when to add a use case).

## Project structure

| Path | Purpose |
|------|---------|
| `src/modules/<feature>/presentation/` | Controllers — HTTP boundary + `ZodValidationPipe`; no business logic |
| `src/modules/<feature>/application/use-cases/` | One `*UseCase` class per business action (single `execute()`) |
| `src/modules/<feature>/application/listeners/` | `@OnEvent` domain-event handlers |
| `src/modules/<feature>/domain/` | Repository **port** (interface + DI token) and `domain/events/` |
| `src/modules/<feature>/infrastructure/` | Drizzle repository implementations (the only SQL-aware layer) |
| `src/database/` | `database.module.ts`, `database.constants.ts` (`DRIZZLE` token), and `schema/` (Drizzle tables) |
| `src/common/pipes/` | `zod-validation.pipe.ts` — `PipeTransform` running `schema.safeParse` |
| `src/common/guards/`, `src/common/decorators/` | `PermissionsGuard`, `@RequiereAccion('<codigo>')`, `@ContextoActual()`, and the endpoint-permissions audit spec |
| `src/shared/auth/` | `JwtService`, `JwtAuthGuard` (verifies the JWT **and** that it names a live `Sesion`), `hashToken` (SHA-256) |
| `src/config/` | `env.validation.ts` — validated environment contract |
| `src/shared/logger/` | `AppLogger` + `@Global()` `LoggerModule` (the mandatory logger) |
| `src/app.module.ts` | Root module — wires `ConfigModule`, `EventEmitterModule`, `LoggerModule`, `DatabaseModule`, feature modules |
| `src/main.ts` | Bootstrap — creates the app, enables CORS, listens on `PORT` |

`modules/users/` is the **reference feature** (all four layers + event + listener); `modules/health/` is the **minimal module** (controller only — no `domain/`/`infrastructure/`). `modules/persona/` follows the same four-layer shape for the actor hierarchy (`domain/persona.ts`'s `Persona`/`Recruiter`/`Postulante`/`Administrador`, `CreatePersonaUseCase`, `DrizzlePersonaRepository`).

### Modules

| Module | Responsibility |
|--------|----------------|
| `users` | The `Usuario` entity (`autenticar`, `incrementarIntentos`, `obtenerRol`) and the `ListaUsuarios` catalog port (`agregarUsuario`, `buscarPorEmail`, …); `GET /users` and `GET /users/:id`, for the Administrador only. `POST /users` no longer exists — an account is created by registering. Owns the `user.created` event and its listener |
| `persona` | The `Persona` hierarchy (`Recruiter`, `Postulante`, `Administrador`); `CreatePersonaUseCase` creates a Persona **holding its role's root groups, in one transaction** — never without roots. Only the seed creates an Administrador |
| `auth` | Register, login, logout and `GET /auth/me`. Owns the `Sesion` entity and its repository, and `ContextosSesionStore`, the in-memory `ContextoSeguridad` of each live `Sesion`. `IniciarSesionUseCase` starts a `Sesion`, `ValidarSesionUseCase` checks it on every request, `CerrarSesionUseCase` ends it |
| `security` | The permission matrix: the Composite (`ComponentePermiso`, `GrupoPermisos`, `Accion`), `Modulo` and `Formulario` (outside the tree), one `MatrizPermisosFactory` per role, the seed catalog (`domain/catalogo-matriz.ts`), `SincronizarMatrizUseCase` (run at boot and by the seed), `GET /security/matrix` and the Administrador's matrix-management endpoints |
| `branches`, `cv-versions`, `analytics`, `followup` | The job-search resources; each handler declares its `Accion` |
| `health` | `GET /health` liveness probe (pings the database); public |

### Endpoints and their Acciones

Every endpoint except register, login and health is guarded by `JwtAuthGuard` then `PermissionsGuard` and declares exactly one `Accion` with `@RequiereAccion('<codigo>')`; `endpoint-permissions.audit.spec.ts` fails if a handler is missing one. The catalog is `src/modules/security/domain/catalogo-matriz.ts` (29 Acciones, each traced to its use cases). A request needs a live `Sesion`, then the `Accion` in the caller's permission tree.

**Public** (no `Sesion`, no `Accion`): `POST /auth/register`, `POST /auth/login`, `GET /health`.

| Endpoint | `codigoAccion` | Use case | Held by |
|----------|----------------|----------|---------|
| `GET /auth/me` | `auth.me` | CU-14 | every role |
| `POST /auth/logout` | `auth.logout` | CU-14 | every role |
| `GET /security/matrix` | `security.viewMatrix` | CU-15 | every role |
| `GET /branches` | `branch.list` | CU-06 | postulante¹, recruiter |
| `GET /branches/:id` | `branch.view` | CU-06 | postulante¹, recruiter |
| `POST /branches` | `branch.create` | CU-02, CU-12 | postulante¹, recruiter |
| `POST /branches/:id/clone` | `branch.clone` | CU-07 | postulante¹, recruiter |
| `POST /branches/:id/archive` | `branch.archive` | CU-09 | postulante¹, recruiter |
| `POST /branches/:id/hitos` | `branch.addHito` | CU-08 | postulante¹, recruiter |
| `POST /branches/:id/hitos/:hitoId/feedback` | `branch.addFeedback` | CU-08 | postulante¹, recruiter |
| `GET /cv-versions` | `cv.list` | CU-16 | postulante |
| `POST /cv-versions` | `cv.create` | CU-16 | postulante |
| `POST /cv-versions/:id/file` | `cv.upload` | CU-16 | postulante |
| `POST /cv-versions/:id/output` | `cv.setOutput` | CU-16 | postulante |
| `PATCH /cv-versions/:id/snapshot-vacante` | `cv.setSnapshotVacante` | CU-16 | postulante |
| `POST /cv-versions/:id/archive` | `cv.archive` | CU-16 | postulante |
| `GET /analytics/overview` | `analytics.overview` | CU-10, CU-11 | postulante, recruiter |
| `GET /followup` | `followup.list` | CU-13 | postulante¹, recruiter |
| `POST /followup/:ramaId/done` | `followup.resolve` | CU-13 | postulante¹, recruiter |
| `GET /security/catalog` | `security.viewCatalog` | CU-15 | administrador |
| `GET /security/groups` | `security.listGroups` | CU-15 | administrador |
| `POST /security/groups` | `security.createGroup` | CU-15 | administrador |
| `PATCH /security/groups/:id` | `security.updateGroup` | CU-15 | administrador |
| `DELETE /security/groups/:id` | `security.deleteGroup` | CU-15 | administrador |
| `GET /security/personas` | `security.listPersonas` | CU-15 | administrador |
| `POST /security/personas/:personaId/roots` | `security.assignRoot` | CU-15 | administrador |
| `DELETE /security/personas/:personaId/roots/:componenteId` | `security.removeRoot` | CU-15 | administrador |
| `GET /users` | `usuario.list` | CU-15 | administrador |
| `GET /users/:id` | `usuario.view` | CU-15 | administrador |

¹ Interim grant: the Postulante keeps the pipeline and follow-up it had before the Recruiter side of the pipeline is split out; those two roots will then be removed from `PostulanteMatrizFactory`.

The matrix decides **which action** a caller may perform; the use case decides **on which data** — a Postulante's own branches and CV versions are scoped by owner in the use case, never in the Composite. The Administrador changes the matrix at runtime (groups and a Persona's roots); Acciones, Formularios and Modulos are seed data, because an Accion is bound to an endpoint in code. A change applies from each Persona's next login.

## Getting started

Run from the repo root (dependencies and Turborepo are wired there):

```sh
# 1. Install all workspace dependencies
pnpm install

# 2. Copy the env file and adjust as needed
cp apps/api/.env.example apps/api/.env

# 3. Start the dev Postgres (Docker) and apply migrations
pnpm --filter api db:up
pnpm --filter api db:migrate

# 4. Start the API in watch mode → http://localhost:3001
pnpm --filter api dev
```

Environment is read from `apps/api/.env` (copied from [`.env.example`](.env.example)): `PORT` (`3001`), `CORS_ORIGIN` (`http://localhost:3000`), `DATABASE_URL` (the dev `postgres` service), `JWT_SECRET` (at least 16 characters) and `JWT_EXPIRES_IN` (`1d`; a `Sesion` expires with its token). `ADMIN_EMAIL`, `ADMIN_PASSWORD` and the optional `ADMIN_NOMBRE_COMPLETO` are read only by `db:seed`, which creates the first Administrador when both of the first two are set — there is no default password, and registration cannot create one. The permission matrix syncs itself every time the API boots. Every API restart, including a `--watch` reload, ends all sessions, so users sign in again. For the full operational detail — the seed (which is destructive to job-search data), the whole stack in Docker, troubleshooting — see [`docs/RUNBOOK.md`](../../docs/RUNBOOK.md).

## Database & migrations

Persistence is Drizzle ORM over Postgres. The schema lives in `src/database/schema/`; migrations are generated into `drizzle/` and configured by [`drizzle.config.ts`](drizzle.config.ts) (which reads `DATABASE_URL`).

- `db:generate` — diff the schema and **create** a new SQL migration in `drizzle/`.
- `db:migrate` — **apply** pending migrations to the dev database.
- `db:studio` — open Drizzle Studio to browse the dev database.

Two Postgres containers are defined in [`docker-compose.yml`](docker-compose.yml):

| Service | Port | Database | Used by |
|---------|------|----------|---------|
| `postgres` | `5432` | `api` | `pnpm --filter api dev` (the app) |
| `postgres-test` | `5433` | `api_test` | the integration/e2e test tiers |

The test tiers point at `postgres-test` via the **committed** [`.env.test`](.env.test) (non-secret — a fixed local URL, in the `.gitignore` allowlist). See [`docs/RUNBOOK.md`](../../docs/RUNBOOK.md) for the full DB ops sequence.

**Identity and security tables** (`src/database/schema/`; migrations `0003`–`0005`):

| Table | Holds |
|-------|-------|
| `usuarios` | The `Usuario`: `email`, `nombre_completo`, `password_hash`, `auth_provider`, `intentos_fallidos`. No role column — the role is the Persona's `tipo` |
| `personas` | One per `Usuario` (unique `usuario_id`); `tipo` is `recruiter`, `postulante` or `administrador` |
| `sesiones` | One row per login: `usuario_id`, `token_jwt` (the token's **SHA-256**, never the token), `fecha_emision`, `fecha_expiracion`. A row is never deleted — logout moves the expiry to now |
| `componentes` | The Composite's nodes, one row each: `tipo` (`grupo` \| `accion`), `nombre`, `descripcion`, `codigo_accion`, `formulario_id`, and `padre_id` (a node has at most one parent) |
| `formularios`, `modulos` | The catalog that groups Acciones for `GET /security/matrix` and the Administrador's screen; outside the tree |
| `persona_componentes` | The roots each Persona holds — one or more, shared groups |

## Scripts

Run from the repo root, scoped with `--filter api` (e.g. `pnpm --filter api dev`).

**App**

| Command | What it does |
|---------|--------------|
| `pnpm --filter api dev` | Start the API in watch mode (`nest start --watch`) on `:3001` |
| `pnpm --filter api build` | Compile to `dist/` (`nest build`, CommonJS) |
| `pnpm --filter api start` | Run the compiled server (`node dist/main.js`) |
| `pnpm --filter api lint` | Lint with Biome (`biome lint .`) |
| `pnpm --filter api check-types` | Type-check with `tsc --noEmit` |

**Test**

| Command | What it does |
|---------|--------------|
| `pnpm --filter api test` | Unit tier — `*.spec.ts`, no DB, safe to run anywhere |
| `pnpm --filter api test:int` | Adapter-integration tier — `*.int.spec.ts`, real Drizzle vs the test DB |
| `pnpm --filter api test:e2e` | E2E tier — `*.e2e-spec.ts`, full `AppModule` over HTTP (supertest) |
| `pnpm --filter api test:db` | Both DB tiers in sequence (`test:int` then `test:e2e`) |

**Database**

| Command | What it does |
|---------|--------------|
| `pnpm --filter api db:generate` | Create a migration from schema changes (`drizzle-kit generate`) |
| `pnpm --filter api db:migrate` | Apply pending migrations to the dev DB |
| `pnpm --filter api db:studio` | Open Drizzle Studio on the dev DB |
| `pnpm --filter api db:seed` | Sync the permission matrix, seed the demo data and — with `ADMIN_EMAIL`/`ADMIN_PASSWORD` — the first Administrador; empties job-search data first, see the runbook |
| `pnpm --filter api db:studio:test` | Open Drizzle Studio on the test DB (via `.env.test`) |
| `pnpm --filter api db:up` | Start the dev `postgres` container (detached) |
| `pnpm --filter api db:down` | Stop the dev `postgres` container |
| `pnpm --filter api db:logs` | Follow the dev `postgres` logs |
| `pnpm --filter api db:reset` | Stop the DB services and wipe their data volumes |
| `pnpm --filter api db:test:up` | Start the `postgres-test` container (detached) |
| `pnpm --filter api db:test:down` | Stop the `postgres-test` container |
| `pnpm --filter api db:test:migrate` | Apply migrations to the test DB (via `.env.test`) |

## Testing

Vitest is split into **three tiers** by how much of the real stack each exercises:

| Tier | Naming | Command | Exercises | Needs DB? |
|------|--------|---------|-----------|-----------|
| **Unit** | `*.spec.ts` | `pnpm --filter api test` | One class in isolation; all deps (`AppLogger`, ports, `EventEmitter2`) mocked | No |
| **Adapter integration** | `*.int.spec.ts` | `pnpm --filter api test:int` | A `infrastructure/` repository against real Drizzle + the test Postgres | Yes |
| **E2E** | `*.e2e-spec.ts` | `pnpm --filter api test:e2e` | The full `AppModule` booted via `@nestjs/testing`, driven over HTTP (supertest) | Yes |

**DB-tier precondition** — the two DB tiers need `postgres-test` up and migrated first:

```sh
pnpm --filter api db:test:up        # start postgres-test
pnpm --filter api db:test:migrate   # apply drizzle/*.sql to it
pnpm --filter api test:db           # test:int then test:e2e
pnpm --filter api db:test:down      # tear down when done
```

Only the unit tier (`pnpm --filter api test`) is DB-free and safe to run headless/in CI. Schema-shape tests (Zod parsing/validation) live in [`@repo/models`](../../packages/models), not here. See [`.agents/rules/testing-strategy.md`](.agents/rules/testing-strategy.md) for tier selection, the `.env.test`/`postgres-test` contract, and why the e2e config carries the SWC decorator-metadata plugin.

## Docker

[`Dockerfile`](Dockerfile) builds a **turbo-pruned** production image (multi-stage — `turbo prune api --docker`, install, build, run as a non-root user, `EXPOSE 3001`). Its **build context is the repo root**:

```sh
docker build -f apps/api/Dockerfile -t api .
```

The full containerized stack (Postgres + API + web) is wired in the root [`docker-compose.yml`](../../docker-compose.yml). The app-scoped [`docker-compose.yml`](docker-compose.yml) here only provides the local Postgres dependencies (dev + test). See [`docs/RUNBOOK.md`](../../docs/RUNBOOK.md) for the full stack lifecycle.

## Domain

Canonical entities and events (`Usuario`, `Persona`, `Sesion`, the permission-matrix classes, the `user.created` event) live in the repo-root domain glossary — [`.agents/ubiquitous-language.md`](../../.agents/ubiquitous-language.md) — and its product invariants in [`.agents/ubiquitous-language-invariants.md`](../../.agents/ubiquitous-language-invariants.md). Read them before touching domain types; the Drizzle `usuarios` table mirrors the `@repo/models` `Usuario` shape. In the security and identity scope the code takes the academic spec's names literally (`Usuario`, `ListaUsuarios`, `nombreCompleto`, `agregar`/`remover`) — [ADR-0023](../../.agents/adr/0023-code-follows-the-spec-class-diagram-first.md).

Each `Usuario` composes a `Persona` (`usuario_id`, unique FK), specialized by a `tipo` discriminant into `Recruiter`, `Postulante` or `Administrador`, persisted in the `personas` table (single-table-with-discriminator) and created at registration by `modules/persona/`, except the Administrador, which only `db:seed` creates. The `Usuario` stores no role: `obtenerRol()` returns its Persona's `tipo`, fixed for life. `passwordHash` never leaves `apps/api`. `cv_versions` also carries a nullable `snapshot_vacante_id` (FK → `vacantes`) — the `VersionPerfil → Vacante` snapshot reference set via `PATCH /cv-versions/:id/snapshot-vacante`, alongside (not replacing) `applications.vacante_id`.

**Security flow.** Login and registration call `IniciarSesionUseCase`, which signs the JWT, loads the Persona's permission tree from the database, persists a `Sesion` holding the token's SHA-256, and has the `Sesion` initialize its `ContextoSeguridad` — once, so permissions are resolved when a session starts and a grant change applies from the next login. `JwtAuthGuard` then requires a live `Sesion` on every request (a database lookup) and puts its `ContextoSeguridad` on the request; `PermissionsGuard` checks the handler's `@RequiereAccion` against it. The design assumes a single API instance — the contexts are in process memory, so a restart ends every session. Design walk-through, in Spanish: [`docs/DOCUMENTACION.md`](../../docs/DOCUMENTACION.md).

## Related docs

- [Root `README.md`](../../README.md) — monorepo overview, workspace layout, and getting started.
- [`AGENTS.md`](AGENTS.md) — canonical agent guidance for this app (commands, architecture, testing).
- [`.agents/rules/use-case-based-architecture.md`](.agents/rules/use-case-based-architecture.md) — the full hexagonal / use-case rule.
- [`.agents/rules/testing-strategy.md`](.agents/rules/testing-strategy.md) — the 3-tier test strategy and test-DB contract.
- [Root `.agents/ubiquitous-language.md`](../../.agents/ubiquitous-language.md) — the domain glossary.
- [`docs/DOCUMENTACION.md`](../../docs/DOCUMENTACION.md) — the Composite and Factory patterns of the security module, end to end (Spanish academic document).
- [apps/web](../web/README.md) — the Next.js frontend that consumes this API.
- [`docs/RUNBOOK.md`](../../docs/RUNBOOK.md) — operations runbook (setup, databases, Docker, troubleshooting).
