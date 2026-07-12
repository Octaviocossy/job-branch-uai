# Rule: Next.js App Router Data-Layer Workflow

This rule governs how `apps/web` fetches and mutates data against the NestJS API
(`apps/api`). Read it before adding or changing hooks, services, or API access.

## Layer diagram

```
app/**/*.tsx (App Router page/layout, "use client" where interactive)
        │
        ▼
features/<feature>/<feature>-view.tsx ("use client")
        │  calls hooks
        ▼
hooks/use-*.ts                 (TanStack Query: useQuery / useMutation, passes `signal`)
        │  calls services
        ▼
services/<resource>.service.ts (thin: url + method → api.* call)
        │  returns TResult<T, ApiError>
        ▼
utilities/api.utility.ts       (api.get/post/put/delete → Promise<TResult<T>>)
        │  wraps axios calls, wraps failures in ApiError
        ▼
config/axios.config.ts         (axios instance: baseURL, interceptors, retries)
        │
        ▼
apps/api (NestJS, HTTP)
```

Requests flow strictly **down** this chain — a layer only calls the layer directly
beneath it. UI components never import axios or `config/axios.config.ts` directly;
they always go through a hook.

## Where things live (post-refactor, no `src/`)

`apps/web` has **no `src/` folder** — application code lives at the app root and the
`@/*` alias maps to `./*`:

| Path | Purpose |
|------|---------|
| `apps/web/config/axios.config.ts` | axios instance, interceptors, retry policy |
| `apps/web/config/query.config.ts` | `createQueryClient()` — builds the TanStack Query client |
| `apps/web/utilities/api.utility.ts` | `api.get/post/put/delete` → `Promise<TResult<T>>` |
| `apps/web/utilities/auth-token.utility.ts` | read/write/clear the auth token |
| `apps/web/models/result.model.ts` | `EResult`, `TResult<T>` (success/error union) |
| `apps/web/models/api-error.model.ts` | `ApiError`, error categorization, `getUserMessage()` |
| `apps/web/services/<resource>.service.ts` | one function per endpoint, e.g. `users_service.list()` |
| `apps/web/hooks/use-*.ts` | TanStack Query hooks (`useQuery`/`useMutation`) that call services |
| `apps/web/query/query-client-ref.ts` | module-level ref to the active `QueryClient` (used by the axios 401 handler) |
| `apps/web/query/session-query-key.ts` | shared query key for session/auth-scoped queries |
| `apps/web/features/<feature>/<feature>-view.tsx` | `"use client"` view components that call hooks |
| `apps/web/app/providers.tsx` | mounts `QueryClientProvider`; registers the query client ref |

## UI layer: App Router, not framework API routes

`apps/web` is a Next.js **App Router** app. Routes live in `app/`. Data fetching happens
in **client components** (`"use client"`) that call hooks from `hooks/`; the TanStack
Query provider (`QueryClientProvider`) is mounted once in `app/providers.tsx` and wraps
the tree from `app/layout.tsx`. Server components may pass initial data down as props,
but the hooks → services → `api` layering below them is unchanged — do not fetch
through a Next.js Route Handler / API route. **NestJS (`apps/api`) is the only HTTP
backend**; `apps/web` never proxies or re-implements API endpoints under `app/api/`.

## Base URL

The axios instance's `baseURL` comes from `NEXT_PUBLIC_API_URL`, defaulting to
`http://localhost:3001` (`config/axios.config.ts`). This is a **direct cross-origin
call to `apps/api`**, not a same-origin `/api` proxy — `withCredentials: true` is set so
cookies still travel with the request. When adding a new environment, set
`NEXT_PUBLIC_API_URL`; do not introduce a Next.js rewrite/proxy in its place.

## The `TResult` / `ApiError` contract

Every service call returns `Promise<TResult<T>>` — never a bare `T`, never a thrown
error for expected failure paths:

```ts
export enum EResult {
  ERROR = "error",
  SUCCESS = "success",
}

export type TResult<T> = Success<T> | Err; // Err.value is ApiError
```

Consumers branch on `result.type === EResult.SUCCESS` (see
`features/home/home-view.tsx`). On the error path, call `result.value.getUserMessage()`
to get a user-facing string — never surface `error.message` directly. `ApiError`
categorizes failures (`EApiErrorType`: network, timeout, validation, client, server,
cancelled, unknown) and exposes `isRetryable()` / `isClientError()` for callers that
need to branch on category instead of the message.

## Hooks: signal + TanStack Query

Every `hooks/use-*.ts` hook uses `useQuery`/`useMutation` and forwards the query
function's `signal` (an `AbortSignal`) into the service call, which forwards it into
`api.*`, which forwards it into axios — so query cancellation (route change, refetch,
component unmount) cancels the underlying HTTP request:

```ts
export const useUsers = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: ({ signal }) => users_service.list(signal),
  });
```

Services stay thin — one call to `api.get/post/put/delete` per method, typed with the
resource's request/response types. Put query-key literals directly in the hook unless a
key is shared across hooks (e.g. `SESSION_QUERY_KEY` in `query/session-query-key.ts`).

## axios: retries, 401 handling, tracing

`config/axios.config.ts` builds a single axios instance:

- `baseURL: NEXT_PUBLIC_API_URL` (see above), `withCredentials: true`, `timeout: 30000`.
- Every request gets a generated `X-Request-ID` header (dev logging correlates
  request/response/retry logs by this ID).
- Dev-only console logging (`NODE_ENV !== "production"`) for requests, responses,
  cancellations, retries, and final failures.
- **Retry policy:** exponential backoff (`1000ms * 2^retryCount`, max 3 retries) for
  network errors (no `error.response`) and for responses with status in
  `[408, 429, 500, 502, 503, 504]`.
- **No retry** for `error.code === "ERR_CANCELED"` or `"ECONNABORTED"`, and no retry for
  HTTP `401` — a `401` instead calls `clearAuthToken()` and removes the session query
  (`getRouterQueryClient()?.removeQueries({ queryKey: SESSION_QUERY_KEY })`) so the app
  re-renders as logged out.

When adding a new resource, do not reimplement retry/auth/tracing logic in the
service or hook — it is centralized in this one axios instance.

## Query client

`config/query.config.ts` exports `createQueryClient()`, called once in
`app/providers.tsx` inside `useState(() => ...)` so the client survives re-renders but
is still created per-mount (App Router requirement — do not hoist it to a module-level
singleton shared across requests on the server). `Providers` also registers the created
client via `setRouterQueryClient()` (`query/query-client-ref.ts`) so the axios 401
handler can reach it outside of React.

## Checklist for a new resource

1. Add/extend types in `models/` (or import shared types from `@repo/models`).
2. Add a `services/<resource>.service.ts` — one function per endpoint, thin wrapper
   around `api.get/post/put/delete`.
3. Add `hooks/use-<resource>.ts` — `useQuery`/`useMutation`, forward `signal` into the
   service call for queries.
4. Consume the hook from a `"use client"` component under `features/` or `app/`.
5. Branch on `EResult.SUCCESS` / `EResult.ERROR`; use `getUserMessage()` for
   error display. Do not add ad-hoc `try/catch` around service calls — errors are
   already captured in the `TResult`.
