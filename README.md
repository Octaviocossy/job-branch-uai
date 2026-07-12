# fullstack-turborepo

A Turborepo monorepo: a Next.js 16 web app and a NestJS 11 API sharing type-safe Zod domain models, built and cached with Turborepo + pnpm.

## Overview

This repository is a pnpm-workspace monorepo orchestrated by [Turborepo](https://turborepo.dev). It contains **two apps** and **three shared packages**:

- **[apps/web](apps/web)** — a Next.js 16 (App Router, React 19) frontend that talks to the API over HTTP.
- **[apps/api](apps/api)** — a NestJS 11 REST API backed by Postgres (via Drizzle).
- **[packages/models](packages/models)** (`@repo/models`) — shared Zod domain schemas both apps import.
- **[packages/typescript-config](packages/typescript-config)** (`@repo/typescript-config`) — shared `tsconfig` bases.
- **[packages/vitest-config](packages/vitest-config)** (`@repo/vitest-config`) — shared Vitest presets.

Dependencies flow **one way**: `apps/*` consume `@repo/models`, and every workspace extends the shared config packages (`@repo/typescript-config`, `@repo/vitest-config`). The two apps never import each other — `apps/web` reaches `apps/api` only over HTTP.

## Tech stack

| Area | Tools |
|------|-------|
| Monorepo | Turborepo `^2.10.4`, pnpm `9.0.0` (workspaces `apps/*`, `packages/*`), Node `>=18` |
| Language | TypeScript `5.9`, [Zod](https://zod.dev) `4` (shared domain schemas) |
| Lint + format | [Biome](https://biomejs.dev) `2` (single root config — lint **and** format) |
| Web (`apps/web`) | Next.js `16` (App Router), React `19`, TanStack Query `5` + axios, React Hook Form, Tailwind CSS `4` |
| API (`apps/api`) | NestJS `11`, Drizzle ORM `0.45` + Postgres `17`, `@nestjs/event-emitter` |
| Testing | [Vitest](https://vitest.dev) `4` (per-project configs; see [Testing](#testing)) |

## Workspace layout

| Path | Package | Purpose |
|------|---------|---------|
| [`apps/web`](apps/web) | `web` | Next.js 16 frontend (App Router, React 19); dev on `:3000` |
| [`apps/api`](apps/api) | `api` | NestJS 11 REST API + Postgres (Drizzle); dev on `:3001` |
| [`packages/models`](packages/models) | `@repo/models` | Shared Zod domain schemas (the type-safe contract between web and api) |
| [`packages/typescript-config`](packages/typescript-config) | `@repo/typescript-config` | Shared `tsconfig` bases every workspace extends |
| [`packages/vitest-config`](packages/vitest-config) | `@repo/vitest-config` | Shared Vitest presets (`node`, `react`) |

## Getting started

**Prerequisites:** Node `>=18`, pnpm `9`, and Docker (for the Postgres database).

```sh
# 1. Install all workspace dependencies
pnpm install

# 2. Copy the example env file and adjust as needed
cp .env.example .env

# 3. Start the Postgres database (Docker) and apply migrations
pnpm --filter api db:up
pnpm --filter api db:migrate

# 4. Start every app in watch mode (web on :3000, api on :3001)
pnpm dev
```

This is the happy path. For the full operational detail — environment variables, the test databases, running the whole stack in Docker, troubleshooting — see [`docs/RUNBOOK.md`](docs/RUNBOOK.md).

## Scripts

Run these from the repo root; Turborepo fans them out across the workspaces and caches results.

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Start all apps in watch mode (uncached, persistent) |
| `pnpm build` | Build every app and package (builds shared packages first) |
| `pnpm lint` | Lint every workspace with Biome |
| `pnpm format` | Format the whole repo with Biome (writes changes; linter off) |
| `pnpm format:check` | Check formatting without writing (CI-safe mirror of `format`) |
| `pnpm check-types` | Type-check every workspace (`tsc --noEmit`, `next typegen` for web) |
| `pnpm test` | Run each workspace's test task (see [Testing](#testing)) |
| `pnpm docker:build` | Build the Docker images for the full stack |
| `pnpm docker:up` | Start the full stack (detached) from existing images |
| `pnpm docker:init` | Build **and** start the full stack (detached) |
| `pnpm docker:down` | Stop the full stack |
| `pnpm docker:logs` | Follow the full stack's logs |
| `pnpm docker:reset` | Stop the stack and wipe its volumes |
| `pnpm api <script>` | Shortcut for `pnpm --filter api <script>` |
| `pnpm web <script>` | Shortcut for `pnpm --filter web <script>` |

Any task can be scoped to a single workspace with a Turborepo filter, e.g. `turbo build --filter=web` or `turbo lint --filter=@repo/models`.

## Architecture & conventions

The canonical, agent-maintained guidance for this repo lives in [`AGENTS.md`](AGENTS.md) and under [`.agents/`](.agents):

- [`.agents/rules/`](.agents/rules) — the enforced conventions (planning, domain glossary, per-app architecture rules, command creation, parallel orchestration).
- [`.agents/ubiquitous-language.md`](.agents/ubiquitous-language.md) — the domain glossary (canonical entity names, types, and relationships). Read it before touching domain code.
- [`.agents/plans/`](.agents/plans) — persisted implementation plans.
- [`.agents/commands/`](.agents/commands) — the canonical specs for the cross-agent slash commands.

This repo is agent-governed: it ships a cross-agent **slash-command** system (Claude Code + OpenCode) and a **parallel-orchestration** runner (decompose a spec into an epic + child issues and execute them in parallel), both defined under [`.agents/`](.agents). See `AGENTS.md` for the full command list and the orchestration model.

## Testing

Each project defines its own Vitest setup and tiers — there is no single repo-wide runner:

- **[apps/api](apps/api)** — a **3-tier** split (unit / adapter-integration / e2e). Only the unit tier is DB-free.
- **[apps/web](apps/web)** — a **2-tier** split (unit / component). Both tiers are DB-free (jsdom only).
- **[packages/models](packages/models)** (`@repo/models`) — a **single** node-tier suite for the Zod schemas.

Only the DB-free tiers (`apps/web`, `@repo/models`, and `apps/api`'s unit tier) are safe to run headless/in CI without a Postgres container. See each project's README and [`docs/RUNBOOK.md`](docs/RUNBOOK.md) for how to run every tier.

## Docker

The root [`docker-compose.yml`](docker-compose.yml) defines the **full containerized stack** — Postgres, the API, and the web app together. Bring it all up with `pnpm docker:init` (build + start detached), configured through [`.env.example`](.env.example). See [`docs/RUNBOOK.md`](docs/RUNBOOK.md) for ports, environment variables, and lifecycle commands.

## Related docs

- [`docs/RUNBOOK.md`](docs/RUNBOOK.md) — operations runbook (setup, databases, Docker, troubleshooting).
- [`docs/README-STYLE.md`](docs/README-STYLE.md) — the shared README house style every project doc follows.
- [`AGENTS.md`](AGENTS.md) — canonical workspace description, commands, and verification quirks.
- [`.agents/ubiquitous-language.md`](.agents/ubiquitous-language.md) — the domain glossary.
- Per-project READMEs: [apps/web](apps/web), [apps/api](apps/api), [packages/models](packages/models), [packages/typescript-config](packages/typescript-config), [packages/vitest-config](packages/vitest-config).
