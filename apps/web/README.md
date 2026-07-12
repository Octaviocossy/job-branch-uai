# apps/web

Next.js 16 (App Router, React 19) frontend — TanStack Query + axios data layer over the NestJS API, sharing `@repo/models` Zod types.

## Overview

`web` is the frontend of the [fullstack-turborepo](../../README.md) monorepo: a Next.js 16 **App Router** app (React 19) that runs on `:3000` in development. It talks to [`apps/api`](../api) **directly over HTTP** — not through Next.js Route Handlers — via a TanStack Query + axios data layer. Forms are built with React Hook Form + zod, and it shares the same [`@repo/models`](../../packages/models) Zod domain schemas the API validates against. Styling is Tailwind CSS v4.

## Tech stack

| Area | Tools |
|------|-------|
| Framework | [Next.js](https://nextjs.org) `16` (App Router), [React](https://react.dev) `19` |
| Language | TypeScript `5.9` |
| Data layer | [TanStack Query](https://tanstack.com/query) `5` + [axios](https://axios-http.com) `1` |
| Forms | [React Hook Form](https://react-hook-form.com) `7` + [zod](https://zod.dev) `4` (`@hookform/resolvers`) |
| Domain types | [`@repo/models`](../../packages/models) (`@repo/models`) |
| Styling | [Tailwind CSS](https://tailwindcss.com) `4` |
| Testing | [Vitest](https://vitest.dev) `4` + [Testing Library](https://testing-library.com) (jsdom) |
| Lint + format | [Biome](https://biomejs.dev) `2` (single root config) |

## Project structure

**No `src/` folder** — application code lives at the app root, one concern per folder, and the `@/*` alias maps to `./*` (so `@/config`, `@/hooks/use-users`, `@/utilities/api.utility` resolve to these directories):

| Path | Purpose |
|------|---------|
| `app/` | App Router routes — layouts, pages, `providers.tsx`, `globals.css`, fonts |
| `features/` | `"use client"` view components (`<feature>-view.tsx`) that call hooks |
| `hooks/` | TanStack Query hooks (`use-*.ts`, `useQuery`/`useMutation`) that call services |
| `services/` | Thin per-resource wrappers (`<resource>.service.ts`) — one function per endpoint |
| `utilities/` | `api.utility.ts` (`api.get/post/put/delete`), token helpers, `cn` (`tailwind.utility`) |
| `config/` | `axios.config.ts` (instance, interceptors, retries) and `query.config.ts` (`createQueryClient()`) |
| `query/` | Module-level `QueryClient` ref + shared session query key (used by the axios 401 handler) |
| `models/` | Frontend-local types — `result.model.ts` (`EResult`, `TResult<T>`) and `api-error.model.ts` (`ApiError`) |
| `components/` | Shared presentational/UI components |

See the **"Where things live"** table in [`.agents/rules/nextjs-api-workflow.md`](.agents/rules/nextjs-api-workflow.md) for the canonical per-file breakdown.

## Data-layer architecture

Requests flow strictly **down** one chain — each layer only calls the one beneath it, and UI never imports axios directly:

```
app/**/*.tsx  (App Router page/layout)
      ▼
features/<feature>/<feature>-view.tsx  ("use client")
      ▼
hooks/use-*.ts        (TanStack Query — useQuery/useMutation, forwards `signal`)
      ▼
services/<resource>.service.ts  (thin: url + method → api.* call)
      ▼
utilities/api.utility.ts        (api.get/post/put/delete → Promise<TResult<T>>)
      ▼
config/axios.config.ts          (single axios instance: baseURL, interceptors, retries)
      ▼
apps/api (NestJS, HTTP)
```

**The `TResult` / `ApiError` contract:** every service returns `Promise<TResult<T>>` — never a bare `T` and never a thrown error for expected failures. Consumers branch on `result.type === EResult.SUCCESS` and, on the error path, call `result.value.getUserMessage()` for a user-facing string rather than surfacing `error.message`. Retries (exponential backoff for network errors and `408/429/5xx`), request tracing (`X-Request-ID`), and `401` handling (clear the auth token, drop the session query) are all centralized in the one axios instance — services and hooks never re-implement them.

**This is a summary — [`.agents/rules/nextjs-api-workflow.md`](.agents/rules/nextjs-api-workflow.md) is the canonical rule** (full flow, retry policy, base-URL config, and the new-resource checklist). Read it before adding or changing hooks, services, or API access.

## Getting started

From the repo root:

```sh
# 1. Install all workspace dependencies
pnpm install

# 2. Start apps/api and its Postgres (the web app has no backend of its own)
#    See apps/api for its setup; the whole-stack runbook lives under docs/.
pnpm --filter api db:up && pnpm --filter api db:migrate
pnpm --filter api dev            # serves the API on :3001

# 3. Start the web app
pnpm --filter web dev            # → http://localhost:3000
```

`apps/web` needs a running [`apps/api`](../api) (and its Postgres) to load real data — see [`apps/api`](../api) and the operations runbook under [`docs/`](../../docs) for the full stack setup. The API base URL comes from `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`); because it is a `NEXT_PUBLIC_*` variable it is **inlined at build time**, so a production image must be built with the correct value.

## Scripts

Run from the repo root, scoped to this app with `--filter`:

| Command | What it does |
|---------|--------------|
| `pnpm --filter web dev` | Start the dev server on `:3000` (`next dev`, hot reload) |
| `pnpm --filter web build` | Production build (`next build`) |
| `pnpm --filter web start` | Serve the production build (`next start`) |
| `pnpm --filter web lint` | Lint with Biome (`biome lint .`) |
| `pnpm --filter web check-types` | Type-check — runs `next typegen` first, then `tsc --noEmit` |
| `pnpm --filter web test` | Run the Vitest suite once (`vitest run`) |

## Testing

Vitest + Testing Library, split into **two tiers** that share a single jsdom config (`@repo/vitest-config/react`) — both are DB-free and headless/CI-safe:

| Tier | Naming | Exercises | Mocks |
|------|--------|-----------|-------|
| **Unit** | `*.test.ts` | A single pure function/class — `ApiError`, `api` result-wrapping, axios retry/401 logic, `cn`, token helpers | Everything external the unit depends on (or nothing, when already pure) |
| **Component** | `*.test.tsx` | A `features/**` view rendered with Testing Library + jsdom, driven by `userEvent` | The `services/` layer (the network seam) via `vi.mock` — nothing below it |

Component tests render through `renderWithClient` from [`test/test-utils.tsx`](test/test-utils.tsx) (a fresh `QueryClient` per test, `retry: false`) and mock the **service seam**, never axios. Zod schema shape is tested in [`@repo/models`](../../packages/models), **not** here — cover how the app *uses* a validated result instead.

Run with `pnpm --filter web test`. **Read [`.agents/rules/testing-strategy.md`](.agents/rules/testing-strategy.md)** before adding or changing any test — it covers tier selection, what to mock per tier, and the schema-out-of-scope rule.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Base URL of the NestJS API (`apps/api`); inlined at build time |

Values live in the root [`.env.example`](../../.env.example) — copy it to `.env` at the repo root and adjust as needed.

## Related docs

- [Root `README.md`](../../README.md) — monorepo overview, workspace layout, and full-stack Docker.
- [`AGENTS.md`](AGENTS.md) — canonical, agent-maintained description of this app.
- [`.agents/rules/nextjs-api-workflow.md`](.agents/rules/nextjs-api-workflow.md) — the App Router data-layer workflow (hooks → services → api → axios).
- [`.agents/rules/testing-strategy.md`](.agents/rules/testing-strategy.md) — the two Vitest tiers and mocking conventions.
- [`apps/api`](../api) — the NestJS API this app consumes over HTTP.
- [`docs/`](../../docs) — operations runbook and the shared README house style.
