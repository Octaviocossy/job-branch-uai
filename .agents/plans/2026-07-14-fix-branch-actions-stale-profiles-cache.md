# Plan: Refresh profile/analytics/followup data after branch actions (cache invalidation)

> Status: **completed**
> Created: 2026-07-14
> Updated: 2026-07-14
> Issue: _none_

## Goal

Make branch (Application) actions immediately refresh every screen whose data is
**derived from branch state** — most importantly the "Perfiles" screen's per-CV
`rendimiento` counts (Aplicaciones / Entrevistas / ROI). When a branch reaches
"Entrevista Técnica", the CV version's interview count on Perfiles must update without a
manual reload, by invalidating the correct TanStack Query caches.

## Context

### Diagnosis (the question the user asked: TanStack refetch vs. DB write?)

**It is a TanStack Query cache-invalidation problem, NOT a DB problem, and NOT a missing
feature.** Verified end-to-end:

- **The DB / API is already correct.** The "número de entrevistas" shown on Perfiles is
  the field `version.rendimiento.interviews`, which is **computed on read** by the API —
  it is *not* a stored column. `GET /cv-versions` → `ListCvVersionsUseCase` attaches a
  freshly-computed `rendimiento` to every row via
  `DrizzleCvVersionRepository.computeRendimiento(cvVersionId)`
  (`apps/api/src/modules/cv-versions/infrastructure/drizzle-cv-version.repository.ts:125-139`),
  which counts distinct `applications` (where `cv_version_id = X`) that have at least one
  `hito` with `status = "Entrevista Técnica"`. There is **no** interview/application/ROI
  column on the `cv_versions` table.
- **`AddHitoUseCase` deliberately does not (and should not) touch `cv_versions`.** Adding a
  hito writes only `hitos` (INSERT) and `applications` (UPDATE status/lastUpdated), inside
  one transaction
  (`apps/api/src/modules/branches/infrastructure/drizzle-branch.repository.ts:209-251`).
  Because the interview count is derived on read, the very next `GET /cv-versions` already
  returns the correct, updated count. **No API/DB change is required.**
- **The real gap is on the web layer.** All four branch mutation hooks invalidate **only**
  `["applications"]`:
  - `apps/web/hooks/use-add-hito.ts:11`
  - `apps/web/hooks/use-create-application.ts:11`
  - `apps/web/hooks/use-clone-application.ts:10`
  - `apps/web/hooks/use-archive-application.ts:10`

  None invalidate `["cv-versions"]` (what the Perfiles screen reads via
  `apps/web/hooks/use-cv-versions.ts:6` → `profiles-view.tsx`), `["analytics", "overview"]`
  (Analítica screen, `apps/web/hooks/use-analytics.ts:6`), or `["followup"]`
  (Seguimiento screen). The QueryClient uses `staleTime: 30_000`
  (`apps/web/config/query.config.ts`), so those screens keep showing stale numbers for up
  to 30s (and only refetch on remount/refocus), which reads as "the data doesn't update".

### Why more than just `["cv-versions"]`

The same derive-on-read pattern applies to the other two screens, so a branch action
leaves all three stale:

| Query key | Screen that reads it | Derived from branch state? |
|-----------|----------------------|-----------------------------|
| `["cv-versions"]` | Perfiles (`rendimiento.applications` / `.interviews` / ROI) | **Yes** — `computeRendimiento` |
| `["analytics", "overview"]` | Analítica (per-CV ROI, conversions, heatmap) | **Yes** — `analytics.folds.ts` over applications/hitos |
| `["followup"]` | Seguimiento (days-since-update, urgency) | **Yes** — recomputed from active applications |

Each branch mutation changes at least one of these:
- **add-hito** ("Entrevista Técnica" etc.) → interview counts, analytics ROI, followup recency.
- **create** → a new application under a CV → `rendimiento.applications`, analytics, followup.
- **clone** → a new application under a CV → same as create.
- **archive** → removes an application from the active/followup set → analytics/followup.

Invalidating the full derived set on every branch mutation is correct and cheap: an
invalidated query with no mounted observer is only *marked stale* (it refetches on next
mount), and a mounted one refetches once.

### Current invalidation convention

- **No central query-key registry.** Keys are inline string-array literals per hook. The
  documented rule (`apps/web/.agents/rules/nextjs-api-workflow.md:110`) is: *"Put
  query-key literals directly in the hook unless a key is shared across hooks (e.g.
  `SESSION_QUERY_KEY` in `query/session-query-key.ts`)."*
- The only existing extracted, shared query artifact is
  `apps/web/query/session-query-key.ts` (`SESSION_QUERY_KEY`). The `query/` folder is the
  established home for cross-hook query concerns (also holds `query-client-ref.ts`).

Because the derived-invalidation set is now shared across **four** hooks, extracting one
shared helper into `query/` is exactly the "shared across hooks" case the rule carves out
— it keeps the four hooks in sync and gives a single source of truth for "what a branch
change affects."

### Constraints

- **`apps/web` only.** Do not modify `apps/api`, Drizzle schema, or `@repo/models` — the
  server already returns correct data. (Confirming this is the whole point of the diagnosis.)
- Follow `apps/web/.agents/rules/nextjs-api-workflow.md` (layering) and
  `apps/web/.agents/rules/testing-strategy.md` (test tiers).
- No new dependencies. TanScript Query `QueryClient` / `useQueryClient` already in use.

## Affected Files

| Action | File Path | Purpose |
|--------|-----------|---------|
| CREATE | `apps/web/query/branch-dependent-keys.ts` | Single source of truth: invalidate every query derived from branch state |
| MODIFY | `apps/web/hooks/use-add-hito.ts` | Invalidate branch-dependent queries on success (was `["applications"]` only) |
| MODIFY | `apps/web/hooks/use-create-application.ts` | Same |
| MODIFY | `apps/web/hooks/use-clone-application.ts` | Same |
| MODIFY | `apps/web/hooks/use-archive-application.ts` | Same |
| CREATE | `apps/web/query/branch-dependent-keys.test.ts` | Unit test: helper invalidates all four keys |

## Step-by-Step Implementation

> **Step 1 — Create the shared invalidation helper**
>
> - **File:** `apps/web/query/branch-dependent-keys.ts`
> - **Action:** CREATE
> - **Details:**
>   - Import the type only: `import type { QueryClient } from "@tanstack/react-query";`
>   - Export a `const` array of the derived keys and a function that invalidates them:
>     ```ts
>     import type { QueryClient } from "@tanstack/react-query";
>
>     /**
>      * Query keys whose data is DERIVED from branch/application state on the server:
>      * - ["applications"]          → the branches list/detail themselves
>      * - ["cv-versions"]           → Perfiles' per-CV `rendimiento` (applications/interviews/ROI),
>      *                               computed on read by the API (computeRendimiento)
>      * - ["analytics", "overview"] → Analítica (per-CV ROI, conversions, heatmap)
>      * - ["followup"]              → Seguimiento (days-since-update, urgency)
>      *
>      * Any successful branch mutation (add-hito, create, clone, archive) must invalidate
>      * ALL of these so branch-derived screens refetch immediately instead of showing stale
>      * counts until `staleTime` (30s) lapses. See
>      * `.agents/plans/2026-07-14-fix-branch-actions-stale-profiles-cache.md`.
>      */
>     export const BRANCH_DEPENDENT_QUERY_KEYS = [
>       ["applications"],
>       ["cv-versions"],
>       ["analytics", "overview"],
>       ["followup"],
>     ] as const;
>
>     export const invalidateBranchDependentQueries = (queryClient: QueryClient): void => {
>       for (const queryKey of BRANCH_DEPENDENT_QUERY_KEYS) {
>         queryClient.invalidateQueries({ queryKey: [...queryKey] });
>       }
>     };
>     ```
>   - Note: `queryKey: ["applications"]` prefix-matches `["applications", id]`, and
>     `["followup"]` prefix-matches `["followup", threshold]`, so both list and
>     detail/param variants are covered by TanStack's default fuzzy matching.
>   - Reference `apps/web/query/session-query-key.ts` for the file/export style and
>     `apps/web/query/query-client-ref.ts` for how the `query/` folder is used.
> - **Why:** One place defines the full "a branch changed → these caches are now stale"
>   set, keeping the four mutation hooks in sync and making the derive-on-read coupling
>   explicit.

> **Step 2 — Use the helper in the add-hito hook**
>
> - **File:** `apps/web/hooks/use-add-hito.ts`
> - **Action:** MODIFY
> - **Details:**
>   - Add import: `import { invalidateBranchDependentQueries } from "@/query/branch-dependent-keys";`
>   - Replace the `onSuccess` body:
>     ```ts
>     onSuccess: () => {
>       queryClient.invalidateQueries({ queryKey: ["applications"] });
>     },
>     ```
>     with:
>     ```ts
>     onSuccess: () => {
>       invalidateBranchDependentQueries(queryClient);
>     },
>     ```
>   - Leave `mutationFn` and the `useQueryClient()` call unchanged.
> - **Why:** Reaching "Entrevista Técnica" via a hito must refresh the Perfiles interview
>   count (the user's exact scenario) plus analytics/followup.

> **Step 3 — Use the helper in the create-application hook**
>
> - **File:** `apps/web/hooks/use-create-application.ts`
> - **Action:** MODIFY
> - **Details:** Same edit as Step 2 — add the import and replace the single-key
>   `invalidateQueries` call in `onSuccess` with `invalidateBranchDependentQueries(queryClient);`.
> - **Why:** A new branch adds an application under a CV → its `rendimiento.applications`
>   (and analytics/followup) must refresh.

> **Step 4 — Use the helper in the clone-application hook**
>
> - **File:** `apps/web/hooks/use-clone-application.ts`
> - **Action:** MODIFY
> - **Details:** Same edit — add the import and replace the `onSuccess` body with
>   `invalidateBranchDependentQueries(queryClient);`.
> - **Why:** Cloning creates another application under a CV → same derived-count refresh as create.

> **Step 5 — Use the helper in the archive-application hook**
>
> - **File:** `apps/web/hooks/use-archive-application.ts`
> - **Action:** MODIFY
> - **Details:** Same edit — add the import and replace the `onSuccess` body with
>   `invalidateBranchDependentQueries(queryClient);`.
> - **Why:** Archiving removes an application from the active/followup set → analytics and
>   followup must refresh (and cv-versions for consistency).

> **Step 6 — Add a unit test for the helper**
>
> - **File:** `apps/web/query/branch-dependent-keys.test.ts`
> - **Action:** CREATE
> - **Details:**
>   - This is the **unit tier** (`*.test.ts`, pure logic, no DOM) per
>     `apps/web/.agents/rules/testing-strategy.md` §1/§9.
>   - Construct a real `QueryClient`, spy on `invalidateQueries`, call the helper, assert
>     it was invoked once per key with the exact key arrays:
>     ```ts
>     import { QueryClient } from "@tanstack/react-query";
>     import { describe, expect, it, vi } from "vitest";
>     import {
>       BRANCH_DEPENDENT_QUERY_KEYS,
>       invalidateBranchDependentQueries,
>     } from "./branch-dependent-keys";
>
>     describe("invalidateBranchDependentQueries", () => {
>       it("invalidates every branch-dependent query key", () => {
>         const queryClient = new QueryClient();
>         const spy = vi.spyOn(queryClient, "invalidateQueries");
>
>         invalidateBranchDependentQueries(queryClient);
>
>         expect(spy).toHaveBeenCalledTimes(BRANCH_DEPENDENT_QUERY_KEYS.length);
>         for (const queryKey of BRANCH_DEPENDENT_QUERY_KEYS) {
>           expect(spy).toHaveBeenCalledWith({ queryKey: [...queryKey] });
>         }
>       });
>
>       it("includes cv-versions so Perfiles refetches after a branch action", () => {
>         expect(BRANCH_DEPENDENT_QUERY_KEYS).toContainEqual(["cv-versions"]);
>       });
>     });
>     ```
>   - Do **not** mock `@tanstack/react-query`; use a real `QueryClient` and spy on the
>     instance method (the unit under test is pure orchestration over that client).
> - **Why:** Locks in the invalidation contract — a regression that drops `["cv-versions"]`
>   from the set (reintroducing this exact bug) fails the suite.

## Architecture Decisions

- **Fix location: web cache invalidation, not the API.** The interview count is computed
  on read (`computeRendimiento`), so the server is already correct the instant a hito is
  written. Adding a stored counter or a cv-versions write to `AddHitoUseCase` would
  duplicate derivable state and risk drift — explicitly rejected. The only defect is that
  the client never asks for the fresh data.
- **Shared helper over inline duplication.** The derived set is identical across four
  hooks; inlining four extra `invalidateQueries` calls per hook (16 lines) would drift out
  of sync. The repo rule (`nextjs-api-workflow.md:110`) says to extract when a key is
  *shared across hooks* — this is that case. The helper lives in `query/` beside
  `session-query-key.ts`, the established home for cross-hook query concerns.
- **Invalidate the full derived set on every branch mutation (uniform), not a
  per-mutation minimal subset.** Although e.g. `archive` arguably doesn't change
  `computeRendimiento`'s application count, uniform invalidation is simpler, is correct in
  all cases, and its only cost is a possible extra refetch of a mounted screen. Precision
  per-mutation would add complexity for no user-visible benefit.
- **Direction is branch → derived screens only.** CV-version mutations
  (`use-create-cv-version`, `use-upload-cv`, `use-set-output-profile`) do **not** need to
  invalidate `["applications"]`: setting an output profile or uploading a file does not
  retroactively change existing applications' snapshots or counts. Out of scope.
- **`staleTime` left unchanged.** Lowering `staleTime` would mask the bug with more
  frequent background refetches but wouldn't make the update immediate after an action.
  Explicit invalidation is the correct mechanism.

## Validation Criteria

- [x] `apps/web/query/branch-dependent-keys.ts` exports `invalidateBranchDependentQueries`
      and `BRANCH_DEPENDENT_QUERY_KEYS` (including `["cv-versions"]`,
      `["analytics", "overview"]`, `["followup"]`, `["applications"]`).
- [x] All four branch mutation hooks call `invalidateBranchDependentQueries(queryClient)`
      in `onSuccess` and no longer contain a lone `invalidateQueries({ queryKey: ["applications"] })`.
- [x] Lint passes: `pnpm --filter web lint` (Biome; `organizeImports` keeps the new import ordered).
- [x] Type check passes: `pnpm --filter web check-types`.
- [x] Unit test passes: `pnpm --filter web test` (the new `branch-dependent-keys.test.ts`
      and the existing `branches-view.test.tsx` / `profiles-view.test.tsx` all green — 13 files, 75 tests passed).
- [ ] **Manual smoke test** (needs `apps/api` + `apps/web` running, `pnpm dev`, seeded DB):
  1. Open **Perfiles**; note a CV version's "Entrevistas" count (e.g. `2`).
  2. Go to **Ramas**, open a branch that uses that CV version, add a hito with status
     **"Entrevista Técnica"** (on a branch that didn't previously have one).
  3. Return to **Perfiles** — the "Entrevistas" count and ROI/"Tasa de entrevistas" for
     that CV update **immediately**, with no manual page reload.
  4. Repeat for **create branch** (Aplicaciones count +1) and confirm **Analítica** and
     **Seguimiento** also reflect the change without a reload.

## Open Questions

None. The diagnosis is confirmed (computed-on-read; web-only invalidation gap) and the fix
is contained to `apps/web`. If the team later wants precise per-mutation invalidation
(e.g. skip `["cv-versions"]` on archive), that is a follow-up optimization, not required
to resolve the reported behavior.
