# Rule: Testing Strategy — `apps/api`

`apps/api` (NestJS 11) splits its Vitest suite into **three tiers** by how much of the real
stack they exercise. Each tier has its own Vitest config, its own file naming convention, and
its own command — picking the wrong tier for a test (e.g. spinning up the full `AppModule`
just to check a use case's branching logic) slows the suite down and couples an otherwise-pure
test to a running Postgres instance.

---

## 1. The three tiers

| Tier | Naming | Config | What it exercises | Needs the test DB? |
|---|---|---|---|---|
| **Unit** | `*.spec.ts` | `vitest.config.ts` | A single class in isolation — use case, listener, controller — with every dependency (`AppLogger`, repository ports, `EventEmitter2`) mocked via `vi.fn()`. | No |
| **Adapter integration** | `*.int.spec.ts` | `vitest.integration.config.ts` | One `infrastructure/` repository (e.g. `DrizzleListaUsuarios`) against the **real** Drizzle client and a real Postgres — no HTTP, no Nest module bootstrap. | Yes |
| **E2E** | `*.e2e-spec.ts` | `vitest.e2e.config.ts` | The full `AppModule`, booted via `@nestjs/testing`, driven over HTTP with `supertest` — controller → use case → real repository → real Postgres. | Yes |

Rule of thumb: **unit = mock the port, integration = real Drizzle adapter vs test DB, e2e =
full `AppModule` over HTTP.** Reach for the next tier up only when the thing under test
actually needs it (real SQL behavior, real HTTP routing/middleware) — most business-logic
coverage belongs in unit tests, not the DB tiers.

**Why the e2e config carries an SWC plugin:** booting the real `AppModule` through Nest's DI
container resolves implicit-type constructor params (e.g. `private readonly logger: AppLogger`,
no explicit `@Inject`) via `design:paramtypes` metadata that `tsc` emits from
`emitDecoratorMetadata`. Vitest's default esbuild transform strips that metadata, so DI would
silently hand these classes `undefined` instead of an instance. `vitest.e2e.config.ts` uses
`unplugin-swc`'s `swc.vite({ jsc: { transform: { legacyDecorator: true, decoratorMetadata: true } } })`
to restore it. Don't remove this plugin from the e2e config, and add it to any other config
that boots Nest's DI container the same way.

**Out of scope:** Zod schema validation (`registerSchema`, etc.) is tested in `@repo/models`
itself. Do not re-test schema shape/parsing here in any tier — test how `apps/api` *uses* the
validated result instead.

---

## 2. File placement & naming

- Unit specs live beside the code under test in `src/`, e.g.
  `src/modules/users/application/use-cases/get-user.use-case.spec.ts`.
- Integration specs also live beside the code under test in `src/`, but end in `.int.spec.ts`,
  e.g. `src/modules/users/infrastructure/drizzle-lista-usuarios.repository.int.spec.ts`.
- E2E specs live under `test/`, ending in `.e2e-spec.ts`, e.g. `test/users.e2e-spec.ts`.
- Shared test helpers live in `test/setup/`:
  - `test/setup/global-db.ts` — Vitest `globalSetup` for the integration/e2e configs; loads
    `.env.test` and runs the committed `apps/api/drizzle/` migrations against the test DB
    once, before any test file in that tier runs.
  - `test/setup/db.ts` — `makeTestDb()` (a `Pool` + `drizzle(pool, { schema })` pair wired to
    `DATABASE_URL`) and `truncateAll(db)` (clears `usuarios` and `empresas` with `CASCADE`,
    which empties every table hanging off them — `personas`, `sesiones`,
    `persona_componentes`, `applications`, `cv_versions`, `vacantes`, … — between tests).
    Import this from integration specs; call `truncateAll` in a `beforeEach`/`afterEach` so
    tests don't leak state into each other. **The permission-matrix catalog (`componentes`,
    `formularios`, `modulos`) is never truncated:** it is seed data that
    `SincronizarMatrizUseCase` writes when the app boots, so an e2e spec finds it already in
    place. An integration spec has no app boot: when it needs a root for a Persona it inserts
    its own `componentes` row and deletes it in `afterAll`, as
    `drizzle-persona.repository.int.spec.ts` does.
  - `test/setup/app.ts` — `createTestApp()`, which compiles the real `AppModule` via
    `Test.createTestingModule` and returns `{ app, http }` (`http` is the raw HTTP server to
    hand to `supertest(http)`). Import this from e2e specs.
  - `test/setup/auth.ts` — the e2e auth helper: `registrar(http, overrides?)` (`POST
    /auth/register` with a unique email, returns the `AuthResponse`), `login(http, email,
    password)` (returns the bearer token) and `crearAdministrador(app, email, password)`.
    Registration cannot create an Administrador, so that helper builds one the way the seed
    does (a `Usuario` plus a `Persona` holding the Administrador factory's default roots).
    Every protected route needs a live `Sesion`, so an e2e request carries a token from
    `registrar` or `login`, never a hand-signed one.
  - `test/setup/doubles.ts` and `test/setup/sesion-doubles.ts` — unit-tier test doubles:
    `makeLogger()`, `makeComponenteRepository()`, `makeSesionRepository()`, `makeSesion()`.
    Reuse them instead of re-declaring an `AppLogger` or repository mock per spec.

---

## 3. The `.env.test` + test-DB contract

- `apps/api/.env.test` is **committed** (it's in the `.gitignore` allowlist alongside
  `.env.example` — only `.env`/`.env.local`/`.env.*.local` are ignored) because it holds no
  secrets: a fixed local Postgres URL, not a credential to anything real.
- It points at a **dedicated** `postgres-test` service in `apps/api/docker-compose.yml`
  (`localhost:5433`, db `api_test`, its own volume) — never the dev `postgres` service
  (`:5432`, db `api`). Running the DB test tiers must never touch dev data.
- `src/database/database.module.ts` only ever reads `DATABASE_URL` off `ConfigService` — it has
  no test-specific branching. The integration/e2e Vitest configs' `globalSetup` is what puts
  the right `DATABASE_URL` in `process.env` before anything boots, so no application code
  needs to know it's under test.
- Because both DB tiers share one fixed-port Postgres, their configs set
  `fileParallelism: false` — DB-touching spec files run one at a time so they don't race each
  other over shared tables. Don't turn this back on without also giving each test its own
  isolated schema/transaction.

---

## 4. Running the tiers

```sh
# Unit — fast, no DB, safe to run anywhere (including headless/CI agents):
pnpm --filter api test

# Integration + e2e — needs the test Postgres running and migrated first:
pnpm --filter api db:test:up        # start postgres-test (docker compose)
pnpm --filter api db:test:migrate   # apply apps/api/drizzle/*.sql to it
pnpm --filter api test:db           # runs test:int then test:e2e

# Or individually, once the test DB is up and migrated:
pnpm --filter api test:int
pnpm --filter api test:e2e

# Tear down when done:
pnpm --filter api db:test:down
```

You don't have to run `db:test:migrate` by hand before `test:int`/`test:e2e` — each tier's
`globalSetup` (`test/setup/global-db.ts`) migrates automatically on every run. The standalone
`db:test:migrate` script exists for ad-hoc inspection (e.g. pointing `drizzle-kit studio` at
the test DB).

**Only `pnpm --filter api test` (the unit tier) is DB-free.** Do not add `test:int`/`test:e2e`
to any headless/parallel-runner agent flow (see
`.agents/rules/parallel-orchestration.md`) — those agents have no guarantee a `postgres-test`
container is running.

---

## 5. Writing a new test — which tier?

- Adding branching logic, a new use case, or a listener → **unit** spec next to the file,
  mocking `AppLogger`/repository port/`EventEmitter2` exactly like
  `get-user.use-case.spec.ts` and `user-created.listener.spec.ts` already do.
- Adding or changing a `infrastructure/drizzle-*.repository.ts` method (new query, changed SQL
  behavior) → **integration** spec (`*.int.spec.ts`) using `makeTestDb()` +
  `truncateAll()`, asserting against the real Drizzle client.
- Adding or changing an HTTP route, its status codes, or its request/response shape end-to-end
  → **e2e** spec (`*.e2e-spec.ts`) using `createTestApp()` + `supertest(http)`.

Do not use a higher tier than the change requires — a new use-case branch is a unit test, not
an e2e test.
