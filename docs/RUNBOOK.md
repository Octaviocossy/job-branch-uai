# Operations Runbook

Every routine and recovery procedure for running this monorepo — from a clean checkout to a running full stack, on the host or in Docker.

> **Audience:** anyone running, testing, or operating this monorepo locally or in Docker.

Where the root [`README.md`](../README.md) gives the happy-path quickstart, this runbook gives the complete, copy-pasteable operational detail. Every command is exact and **run from the repo root** unless stated otherwise.

## Contents

1. [Prerequisites](#1-prerequisites)
2. [First-time setup](#2-first-time-setup)
3. [Local development (host)](#3-local-development-host)
4. [Database lifecycle](#4-database-lifecycle)
5. [Running the full stack in Docker](#5-running-the-full-stack-in-docker)
6. [Testing](#6-testing)
7. [Quality gates](#7-quality-gates)
8. [Common tasks / recovery](#8-common-tasks--recovery)
9. [Reference](#9-reference)

---

## 1. Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node | `>=18` | Matches the root `package.json` `engines.node`. |
| pnpm | `9` | The pinned package manager (`packageManager: pnpm@9.0.0`). Enable via Corepack: `corepack enable`. |
| Docker + Docker Compose | current | Needed for Postgres (dev **and** test databases) and the full containerized stack. |

**Ports used** (make sure these are free, or change them via the `*_PORT` env vars — see [First-time setup](#2-first-time-setup)):

| Port | Service |
|------|---------|
| `:3000` | `web` (Next.js) |
| `:3001` | `api` (NestJS) |
| `:5432` | dev Postgres (database `api`) |
| `:5433` | test Postgres (database `api_test`) |

---

## 2. First-time setup

```sh
# 1. Clone and enter the repo
git clone <this-repo-url>
cd fullstack-turborepo

# 2. Enable pnpm 9 via Corepack (skip if pnpm 9 is already installed)
corepack enable

# 3. Install every workspace's dependencies
pnpm install

# 4. Create the env files (copy the committed examples)
cp .env.example .env                    # root — used by docker-compose.yml
cp apps/api/.env.example apps/api/.env  # apps/api — used when running the API on the host
```

### Environment variables

**Root [`.env`](../.env.example)** — consumed by the root [`docker-compose.yml`](../docker-compose.yml) (the full containerized stack):

| Key | Default | What it does |
|-----|---------|--------------|
| `GITHUB_TOKEN` | `""` | GitHub Personal Access Token (`repo` scope) for the GitHub MCP server used by the issue slash commands. Not needed to run the apps. |
| `POSTGRES_USER` | `postgres` | Postgres role for the compose `postgres` service. |
| `POSTGRES_PASSWORD` | `postgres` | Postgres password for the compose `postgres` service. |
| `POSTGRES_DB` | `api` | Database name created by the compose `postgres` service. |
| `POSTGRES_PORT` | `5432` | Host port the compose `postgres` service publishes. |
| `API_PORT` | `3001` | Host port the `api` container listens on and publishes. |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/api` | Connection string the API uses. In Docker, the compose file overrides the host to the internal `postgres` service. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Browser-facing API base URL for `apps/web`. **Inlined into the web bundle at build time** (see the callout below). |
| `WEB_PORT` | `3000` | Host port the `web` container publishes. |

**`apps/api/.env`** — consumed when the API runs on the **host** (`pnpm --filter api dev`):

| Key | Default | What it does |
|-----|---------|--------------|
| `NODE_ENV` | `development` | Node environment. |
| `PORT` | `3001` | Port the NestJS API listens on. |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed browser origin (the web app). |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/api` | Points the API at the **dev** Postgres on `:5432`. |

> **`NEXT_PUBLIC_API_URL` is a build-time value.** Next.js inlines `NEXT_PUBLIC_*` variables into the client bundle when the app is **built**, not when it runs. Changing it requires a rebuild (`pnpm --filter web build`, or `pnpm docker:build` for the container). It is passed to the `web` image as the `NEXT_PUBLIC_API_URL` **build arg** in `docker-compose.yml`.

> **The test database uses a committed env file.** `apps/api/.env.test` (`NODE_ENV=test`, `DATABASE_URL=…@localhost:5433/api_test`) is **committed** — it holds no secrets, only a fixed local test-DB URL. Do not copy or edit it during setup; the DB test scripts read it directly.

---

## 3. Local development (host)

The recommended dev loop runs the apps on the host and Postgres in Docker.

```sh
# 1. Start the dev database (app-scoped postgres container on :5432)
pnpm --filter api db:up

# 2. Apply the committed Drizzle migrations to it
pnpm --filter api db:migrate

# 3a. Start EVERY app in watch mode (Turborepo fans out; web :3000, api :3001)
pnpm dev
```

Or run a single app scoped with a Turborepo filter:

```sh
# 3b. Start just the API (Nest watch mode, :3001)
pnpm --filter api dev

# 3c. Start just the web app (Next.js dev server, :3000)
pnpm --filter web dev
```

The web app on **`:3000`** calls the API on **`:3001`** (via `NEXT_PUBLIC_API_URL`). Both must be running for the frontend's data layer to work. `pnpm api <script>` / `pnpm web <script>` are shortcuts for `pnpm --filter api <script>` / `pnpm --filter web <script>`.

---

## 4. Database lifecycle

There are **two independent Postgres databases**, both defined in [`apps/api/docker-compose.yml`](../apps/api/docker-compose.yml) and driven by the `apps/api` `db:*` scripts. They **never share data**:

| Database | Port | DB name | Volume | Used by |
|----------|------|---------|--------|---------|
| dev | `:5432` | `api` | `api-postgres-data` | `pnpm --filter api dev` (host) |
| test | `:5433` | `api_test` | `api-postgres-test-data` | the api integration/e2e test tiers |

### Dev database

```sh
pnpm --filter api db:up      # start the dev postgres container (:5432)
pnpm --filter api db:logs    # follow its logs
pnpm --filter api db:down    # stop it (keeps the volume / data)
pnpm --filter api db:reset   # stop AND wipe volumes (destructive — see note)
```

> **`db:reset` is destructive.** It runs `docker compose down -v` in `apps/api`, which removes the app-scoped Postgres **volumes** — you lose all dev data (and, since both services share the compose file, the test DB's data too). After a reset, re-run `db:up` → `db:migrate` to rebuild from scratch.

### Migrations

```sh
pnpm --filter api db:generate   # generate a new migration from schema changes (drizzle-kit)
pnpm --filter api db:migrate    # apply pending migrations to the dev DB (:5432/api)
pnpm --filter api db:studio     # open Drizzle Studio against the dev DB
```

Edit the Drizzle schema under `apps/api/src/database/schema/`, run `db:generate` to emit a new SQL migration into `apps/api/drizzle/`, then `db:migrate` to apply it.

### Test database

The integration/e2e test tiers run against the **dedicated** `postgres-test` service on `:5433` (database `api_test`), using `apps/api/.env.test` — never the dev DB.

```sh
pnpm --filter api db:test:up       # start the test postgres container (:5433)
pnpm --filter api db:test:migrate  # apply migrations to it (via .env.test)
pnpm --filter api db:test:down     # stop the test container
pnpm --filter api db:studio:test   # open Drizzle Studio against the test DB (via .env.test)
```

> You don't normally need `db:test:migrate` by hand — each DB test tier's Vitest `globalSetup` migrates the test DB automatically on every run. The standalone script exists for ad-hoc inspection (e.g. pointing `db:studio:test` at a fresh test DB). See [`apps/api/.agents/rules/testing-strategy.md`](../apps/api/.agents/rules/testing-strategy.md).

---

## 5. Running the full stack in Docker

The root [`docker-compose.yml`](../docker-compose.yml) builds and runs the **whole stack together** — `postgres` + `api` (`:3001`) + `web` (`:3000`) — with the named volume `postgres-data`. Env comes from the **root [`.env`](../.env.example)**.

```sh
# Build the images AND start the stack detached (one step)
pnpm docker:init

# — or, in two steps —
pnpm docker:build   # build the postgres/api/web images
pnpm docker:up      # start the stack from existing images (detached)

pnpm docker:logs    # follow all three services' logs
pnpm docker:down    # stop the stack (keeps the postgres-data volume)
pnpm docker:reset   # stop AND wipe volumes (docker compose down -v — destructive)
```

Notes:

- The `api` container connects to the internal `postgres` service (compose overrides `DATABASE_URL`'s host to `postgres:5432`), not your host's `:5432`.
- The `web` image is built with the `NEXT_PUBLIC_API_URL` **build arg** (default `http://localhost:3001`) — change it in the root `.env` and rebuild (`pnpm docker:build` / `pnpm docker:init`) for it to take effect.
- `docker compose ps` shows the running services and their published ports.

---

## 6. Testing

Each project owns its own Vitest setup — there is **no single repo-wide runner**. Only the DB-free tiers are safe in headless / CI / parallel-runner flows.

| Project | Command | Tier(s) | Needs a DB? | Headless-safe? |
|---------|---------|---------|-------------|----------------|
| [`@repo/models`](../packages/models) | `pnpm --filter @repo/models test` | single node tier | No | ✅ Yes |
| [`apps/web`](../apps/web) | `pnpm --filter web test` | unit + component (jsdom) | No | ✅ Yes |
| [`apps/api`](../apps/api) | `pnpm --filter api test` | unit only | No | ✅ Yes |
| [`apps/api`](../apps/api) | `pnpm --filter api test:db` | integration + e2e | **Yes (test DB)** | ❌ No |

> **Headless-safety callout.** Only the DB-free tiers — `@repo/models`, all of `apps/web`, and `apps/api`'s **unit** tier (`pnpm --filter api test`) — are safe to run in headless / CI / parallel-runner agent flows. The `apps/api` DB tiers (`test:int`, `test:e2e`, `test:db`) require the `postgres-test` container up **and** migrated first; never add them to a headless flow. See [`apps/api/.agents/rules/testing-strategy.md`](../apps/api/.agents/rules/testing-strategy.md) and [`.agents/rules/parallel-orchestration.md`](../.agents/rules/parallel-orchestration.md).

### `@repo/models` (single node tier, no DB)

```sh
pnpm --filter @repo/models test
```

Zod schema shape/parsing tests. No DOM, no DB, no network — safe anywhere.

### `apps/web` (unit + component, jsdom, no DB)

```sh
pnpm --filter web test
```

Both tiers (unit `*.test.ts`, component `*.test.tsx`) run in the same jsdom config. No database, no real browser — safe anywhere.

### `apps/api` (unit is DB-free; the DB tiers need the test DB)

```sh
# Unit tier — fast, no DB, headless-safe:
pnpm --filter api test

# DB tiers — REQUIRE the test database up and migrated first:
pnpm --filter api db:test:up        # 1. start postgres-test (:5433)
pnpm --filter api db:test:migrate   # 2. apply migrations to it
pnpm --filter api test:db           # 3. run integration + e2e (test:int then test:e2e)
pnpm --filter api db:test:down      # 4. stop the test DB when done

# Or run a single DB tier once the test DB is up and migrated:
pnpm --filter api test:int          # adapter integration (*.int.spec.ts)
pnpm --filter api test:e2e          # e2e over HTTP (*.e2e-spec.ts)
```

### Run everything

```sh
pnpm test   # Turborepo fans the `test` task out across all workspaces
```

`pnpm test` runs each workspace's default `test` task — that is, the **DB-free** tiers only (`@repo/models`, `apps/web`, and `apps/api`'s unit tier). The `apps/api` DB tiers (`test:int`/`test:e2e`) are **not** part of the default `test` task and must be run explicitly with the test DB up (see above).

---

## 7. Quality gates

Run these from the repo root before pushing:

```sh
pnpm lint           # Biome lint across every workspace (turbo run lint)
pnpm format         # Biome formatter — writes fixes across the repo (linter off)
pnpm format:check   # read-only formatting check (CI-safe mirror of format)
pnpm check-types    # type-check every workspace
pnpm build          # production build of every app and package
```

Notes:

- `pnpm format` / `pnpm format:check` run Biome's formatter (+ import organization) over the **whole repo** from a single root [`biome.json`](../biome.json); there is no per-package format config.
- `pnpm check-types` runs `turbo run check-types`, which **builds the shared packages first** (`@repo/models`, the config packages) and runs `next typegen` for `apps/web` before `tsc --noEmit` — so type errors can originate from Next's generated route types, not only handwritten code.
- `pnpm build` builds shared packages before the apps that consume them (Turborepo `^build` dependency).

---

## 8. Common tasks / recovery

### Port already in use

A start command fails with `EADDRINUSE` or a compose port-bind error. Either free the port or change it:

```sh
lsof -i :3000        # find what holds a port (swap 3000 for 3001 / 5432 / 5433)
kill <pid>           # stop it
```

Or change the port via env: set `WEB_PORT` / `API_PORT` / `POSTGRES_PORT` in the root `.env` (Docker), or `PORT` in `apps/api/.env` (host API).

### Database connection refused

The API can't reach Postgres (`ECONNREFUSED …:5432`). The dev DB container probably isn't running:

```sh
pnpm --filter api db:up                       # (re)start the dev postgres container
cd apps/api && docker compose ps && cd -      # confirm `postgres` is up and healthy
```

For the Docker stack, check `docker compose ps` from the repo root and `pnpm docker:logs`.

### Migrations out of sync

Schema and database disagree (a query fails on a missing column, or `db:migrate` reports pending migrations):

```sh
pnpm --filter api db:migrate    # apply any pending migrations to the dev DB
```

If the dev DB is corrupt or you want a clean slate (**destructive — wipes all dev data**):

```sh
pnpm --filter api db:reset      # stop + wipe the volumes
pnpm --filter api db:up         # start a fresh container
pnpm --filter api db:migrate    # rebuild the schema from scratch
```

### Integration / e2e tests failing on the DB

`test:int` / `test:e2e` / `test:db` fail with connection or missing-table errors — the `postgres-test` container isn't up or isn't migrated:

```sh
pnpm --filter api db:test:up        # start postgres-test (:5433)
pnpm --filter api db:test:migrate   # migrate it
pnpm --filter api test:db           # retry
```

### Stale Turborepo cache

A task returns a stale result or a cache seems wrong. Force a fresh run and inspect the cache:

```sh
pnpm build --force        # bypass the cache for this run (passes `--force` to turbo)
turbo run build --force   # equivalent, invoking turbo directly
```

Turborepo caches task outputs by input hash; `--force` re-runs ignoring the cache. `dev` is uncached and persistent, so it is never served from cache.

### Docker rebuild after dependency changes

After changing dependencies or a `Dockerfile`, rebuild the images (the running containers use the **built** image, not your working tree):

```sh
pnpm docker:build   # rebuild images from the current source
pnpm docker:init    # rebuild AND restart the stack in one step
```

Remember `NEXT_PUBLIC_API_URL` is baked into the `web` image at build time — a rebuild is required for a changed value to reach the browser bundle.

---

## 9. Reference

### Root scripts (`package.json`)

| Script | What it runs | Purpose |
|--------|--------------|---------|
| `pnpm dev` | `turbo run dev` | Start all apps in watch mode (web `:3000`, api `:3001`). |
| `pnpm build` | `turbo run build` | Production build of every app/package. |
| `pnpm lint` | `turbo run lint` | Biome lint across all workspaces. |
| `pnpm format` | `biome check --write --linter-enabled=false .` | Format the repo (writes fixes). |
| `pnpm format:check` | `biome check --linter-enabled=false .` | Read-only formatting check. |
| `pnpm check-types` | `turbo run check-types` | Type-check all workspaces. |
| `pnpm test` | `turbo run test` | Run each workspace's DB-free test task. |
| `pnpm docker:build` | `docker compose build` | Build the full-stack images. |
| `pnpm docker:up` | `docker compose up -d` | Start the full stack (detached). |
| `pnpm docker:init` | `docker compose up --build -d` | Build + start the full stack (detached). |
| `pnpm docker:down` | `docker compose down` | Stop the full stack. |
| `pnpm docker:logs` | `docker compose logs -f` | Follow the full stack's logs. |
| `pnpm docker:reset` | `docker compose down -v` | Stop + wipe volumes. |
| `pnpm api <script>` | `pnpm --filter api <script>` | Shortcut into `apps/api`. |
| `pnpm web <script>` | `pnpm --filter web <script>` | Shortcut into `apps/web`. |

### `apps/api` scripts (`apps/api/package.json`)

| Script | What it runs | Purpose |
|--------|--------------|---------|
| `db:up` | `docker compose up -d postgres` | Start the dev DB (`:5432/api`). |
| `db:down` | `docker compose down postgres` | Stop the dev DB (keeps data). |
| `db:logs` | `docker compose logs -f postgres` | Follow the dev DB logs. |
| `db:reset` | `docker compose down -v` | Stop + wipe the app-scoped DB volumes (destructive). |
| `db:generate` | `drizzle-kit generate` | Generate a migration from schema changes. |
| `db:migrate` | `drizzle-kit migrate` | Apply migrations to the dev DB. |
| `db:studio` | `drizzle-kit studio` | Drizzle Studio against the dev DB. |
| `db:test:up` | `docker compose up -d postgres-test` | Start the test DB (`:5433/api_test`). |
| `db:test:down` | `docker compose stop postgres-test` | Stop the test DB. |
| `db:test:migrate` | `dotenv -e .env.test -- drizzle-kit migrate` | Migrate the test DB (via `.env.test`). |
| `db:studio:test` | `dotenv -e .env.test -- drizzle-kit studio` | Drizzle Studio against the test DB. |
| `dev` | `nest start --watch` | Run the API on the host (`:3001`). |
| `build` | `nest build` | Build the API. |
| `test` | `vitest run -c vitest.config.ts` | Unit tier (no DB, headless-safe). |
| `test:int` | `vitest run -c vitest.integration.config.ts` | Adapter integration tier (needs test DB). |
| `test:e2e` | `vitest run -c vitest.e2e.config.ts` | E2E tier over HTTP (needs test DB). |
| `test:db` | `pnpm test:int && pnpm test:e2e` | Both DB tiers in sequence (needs test DB). |

### Related docs

- [`README.md`](../README.md) — repo overview, tech stack, and happy-path quickstart.
- Per-project docs: [`apps/web`](../apps/web) · [`apps/api`](../apps/api) · [`packages/models`](../packages/models) · [`packages/typescript-config`](../packages/typescript-config) · [`packages/vitest-config`](../packages/vitest-config).
- [`docs/README-STYLE.md`](./README-STYLE.md) — the shared README house style.
- [`AGENTS.md`](../AGENTS.md) — canonical workspace description, commands, and verification quirks.
- Testing rules: [`apps/api`](../apps/api/.agents/rules/testing-strategy.md) · [`apps/web`](../apps/web/.agents/rules/testing-strategy.md) · [`packages/models`](../packages/models/.agents/rules/testing-strategy.md).
- App architecture rules: [`apps/api` use-case architecture](../apps/api/.agents/rules/use-case-based-architecture.md) · [`apps/web` Next.js data layer](../apps/web/.agents/rules/nextjs-api-workflow.md).
- Per-project agent config: [`apps/api/AGENTS.md`](../apps/api/AGENTS.md) · [`apps/web/AGENTS.md`](../apps/web/AGENTS.md) · [`packages/models/AGENTS.md`](../packages/models/AGENTS.md).
- Compose files: root [`docker-compose.yml`](../docker-compose.yml) (full stack) · [`apps/api/docker-compose.yml`](../apps/api/docker-compose.yml) (dev + test Postgres).
