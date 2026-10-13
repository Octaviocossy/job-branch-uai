# Rule: Testing Strategy — `apps/web`

`apps/web` (Next.js 16, App Router) splits its Vitest suite into **two tiers** by how much of
the app they exercise. Unlike `apps/api` (which splits configs across a DB `globalSetup` and
an SWC decorator-metadata plugin — see `apps/api/.agents/rules/testing-strategy.md`), the
frontend has **no database and no DI container to bootstrap**, so both tiers run in the same
Vitest config and are fully headless/CI-safe. They differ only by file-naming convention and
what they mock.

---

## 1. The two tiers

| Tier | Naming | What it exercises | What it mocks |
|---|---|---|---|
| **Unit** | `*.test.ts` | A single pure function/class in isolation — `ApiError`, the `api` utility's result-wrapping, the axios instance's retry/401 logic, `cn`, `auth-token` helpers. | Everything external the unit depends on (e.g. `@/config` for the axios instance) — or nothing, when the unit is already pure. |
| **Component / interaction** | `*.test.tsx` | A `features/**` view rendered with Testing Library + jsdom and driven by `userEvent`, wrapped via `renderWithClient`. | The **`services/` layer** (the network seam) via `vi.mock` — nothing below it. |

**Rule of thumb:** unit = pure logic, no DOM; component = render the feature, mock the service
seam, assert the DOM. Reach for a component test only when the DOM/interaction actually
matters — most logic (error categorization, retry policy) belongs in unit tests, not a
rendered tree.

---

## 2. Single Vitest config — no split

`apps/api` splits `vitest.config.ts` / `vitest.integration.config.ts` / `vitest.e2e.config.ts`
because its tiers need different infrastructure (a test-DB `globalSetup`, an SWC plugin for
Nest's DI metadata). `apps/web` needs **none of that**: both tiers run in the same jsdom
config, `apps/web/vitest.config.ts`, which merges the `@repo/vitest-config/react` preset
(`environment: "jsdom"`, `setupFiles: ["@repo/vitest-config/setup.react"]`). Do not add a second
Vitest config for the component tier — the tiers are a naming/mocking convention, not a
runtime split.

---

## 3. `test/test-utils.tsx` — the component tier's render entry point

`apps/web/test/test-utils.tsx` exports:

- `createTestQueryClient()` — a fresh `QueryClient` with `retry: false` and `gcTime: 0` on
  queries and `retry: false` on mutations, so error states resolve deterministically in a test
  and no cache leaks between tests.
- `renderWithClient(ui, options?)` — renders `ui` wrapped in a `QueryClientProvider` backed by
  a fresh `createTestQueryClient()`, returning `{ queryClient, ...renderResult }`.

Component tests import `renderWithClient` instead of hand-rolling a `QueryClientProvider` per
test file (see `features/profiles/profiles-view.test.tsx`). A test that still builds its own
provider should migrate to it when touched.

---

## 4. jest-dom matchers are global

`@testing-library/jest-dom` matchers (`toBeInTheDocument()`, etc.) are registered globally by
the `@repo/vitest-config/react` preset's `setupFiles` — `apps/web/vitest.d.ts` only supplies the
ambient types for them. **Never re-import `@testing-library/jest-dom` in a test file.**

---

## 5. Mock the service seam, not axios

Component tests `vi.mock("@/services/<resource>.service")` — they never mock axios or
`@/config/axios.config` directly. This keeps the hook → service wiring exercised for real
while stubbing only the network boundary (see `features/profiles/profiles-view.test.tsx`'s
`vi.mock("@/services/cv-versions.service", ...)` / `vi.mock("@/services/auth.service", ...)`).

Unit tests for `utilities/api.utility.ts` mock `@/config` (the axios instance) instead — one
layer lower, since the unit under test *is* the thing that calls axios. A unit test for the
axios instance itself (`config/axios.config.ts`) uses a mock adapter rather than mocking
axios's own module.

### Permission-gated controls need a session

The menu, the action buttons and the routes are filtered by `usePermissions()` against the
`permisos` that `GET /auth/me` returns (the static map in `config/permissions.config.ts`). A
component test of a gated control — a button, a nav link, a guarded route — therefore has to
sign in first, or the control is simply absent. Mock `auth.service`'s `me` with a session
from `test/session-fixture.ts` and set a token:

```tsx
vi.mock("@/services/auth.service", () => ({
  auth_service: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

describe("ProfilesView", () => {
  isolateLocalStorage();

  beforeEach(() => {
    vi.mocked(auth_service.me).mockResolvedValue({ type: EResult.SUCCESS, value: sessionWith(ALL_POSTULANTE_CODES), status: 200 });
    setAuthToken("test-token");
  });

  afterEach(() => {
    clearAuthToken();
  });
});
```

- `sessionWith(codes)` builds a `MeResponse` holding exactly those `codigoAccion` values;
  `ALL_POSTULANTE_CODES` and `ADMINISTRADOR_CODES` are the full sets of the two roles. To
  test a denied control, pass the full set minus the code (`ALL_POSTULANTE_CODES.filter(...)`)
  and assert the control is absent.
- `setAuthToken("test-token")` is required: `useSession` is disabled while there is no token,
  so without it `me` is never called and every gated control stays hidden.
- `isolateLocalStorage()` (`test/isolated-storage.ts`) goes first in the `describe`, before any
  `beforeEach` that touches the token. It gives each test its own in-memory `localStorage`;
  the file-backed one is shared by every test file running in parallel, so one file clearing
  its token would sign the others out.
- Examples: `features/profiles/profiles-view.test.tsx`, `components/sidebar.test.tsx`,
  `components/route-permission-guard.test.tsx`. The route lookup helpers (`codigoParaRuta`,
  `primeraRutaPermitida`) are unit-tested in `config/permissions.config.test.ts`; the
  action → code map (`ACTION_PERMISSIONS`) is exercised through the component tests.

---

## 6. Out of scope: Zod schema validation

Zod schema validation (`registerSchema`, etc.) is tested in `@repo/models` — never re-test
schema shape or parsing in any `apps/web` tier. Test how the app *uses* the validated result
instead (e.g. "an invalid email shows a form error and does not call the service").

---

## 7. Headless / CI safety

Both tiers are fully DB-free and browser-free (jsdom only). Unlike `apps/api`'s `test:int` /
`test:e2e`, `pnpm --filter web test` is safe to run in headless/parallel-runner agent flows
(see `.agents/rules/parallel-orchestration.md`) with no external service required.

---

## 8. Playwright (opt-in, not built)

A real-browser end-to-end tier — running `apps/web` against a live `apps/api` and driving a
few smoke flows (load the home page and see the API health status; create a user through the
form and see it reflected) — is a documented **future opt-in**, not part of this rule's active
tiers. It would use Playwright, a separate tool outside Vitest, with its own config and
browser install step. Do not add Playwright dependencies or config until this opt-in is
explicitly requested.

---

## 9. Writing a new test — which tier?

- Pure logic, error mapping/categorization, retry policy, a small helper (`cn`,
  `auth-token` read/write) → **unit** (`*.test.ts`) next to the file under test.
- A view's rendered states, or a user interaction end-to-end with the service mocked
  (form submit, loading/error/success states) → **component** (`*.test.tsx`) under
  `features/`, using `renderWithClient` from `test/test-utils.tsx`.

Do not reach for a component test when a unit test would do — most branching logic (e.g. how
an `AxiosError` maps to an `ApiError` category) belongs in a unit test, not a rendered tree.
