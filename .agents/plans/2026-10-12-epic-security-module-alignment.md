# Plan: Epic — Align the security module with spec v8.0

> Status: **draft**
> Created: 2026-10-12
> Issue: #25
> Integration branch: epic/25-security-module-alignment

## Goal

Bring the security module — the permission matrix, session and identity, and how permissions are
enforced across `apps/api` and `apps/web` — in line with the academic spec's latest iteration
(document v8.0), as settled in `.agents/specs/2026-10-12-security-module-spec-alignment.md`, with
the class diagram 19.13 governing (ADR-0023).

## Children & Waves

| Wave | Issue | Branch | Title | Status |
|------|-------|--------|-------|--------|
| 1 | #26 | `26-usuario-identity-foundation` | refactor: Usuario identity with spec names and role on Persona | pending |
| 2 | #27 | `27-persisted-permission-matrix` | feat: persisted permission matrix, role factories and Administrador | pending |
| 3 | #28 | `28-persisted-sesion` | feat: persisted Sesion with token hash, logout and per-session matrix | pending |
| 3 | #29 | `29-matrix-admin-api` | feat: Administrador permission-matrix management API (CU-15) | pending |
| 3 | #30 | `30-permission-aware-web` | feat: permission-aware web menu, actions and routes | pending |
| 4 | #31 | `31-enforce-endpoint-permissions` | feat: enforce one Accion per protected endpoint | pending |
| 4 | #32 | `32-matrix-admin-screen` | feat: Administrador permission-matrix management screen (CU-15) | pending |
| 5 | #33 | `33-docs-security-alignment` | docs: document the spec-aligned security module | pending |

## Dependency Edges

```
27 -> 26
28 -> 27
29 -> 27
30 -> 27
31 -> 27
31 -> 28
31 -> 29
32 -> 29
32 -> 30
33 -> 28
33 -> 29
33 -> 30
33 -> 31
33 -> 32
```

## Decomposition rationale

Foundation-first, data-before-UI and shared-artifact ordering
(`.agents/rules/parallel-orchestration.md` › Decomposition Heuristics).

- **#26 is the foundation.** The `User` → `Usuario` rename touches `@repo/models`, the API and the
  web, so it must land before anything else. It owns migration `0003`, which is hand-written over a
  generated snapshot, because drizzle-kit's rename prompt needs a TTY.
- **#27 owns the security module's model.** It adds the tables (`0004`), the seed catalog of all 29
  Acciones, and the role factories. It fixes every `codigoAccion` up front, including the ones whose
  endpoints #28 and #29 add later. That lets the wave-3 slices code against a complete catalog.
  #27 also adds the `request.contextoSeguridad` / `@ContextoActual()` seam that #28 and #29 share.
- **Wave 3 runs three slices on disjoint files:**
  - #28 (sessions, `0005`) owns `modules/auth`, `shared/auth` and the guards;
  - #29 (admin API) owns `modules/security` and `@repo/models` `permiso.schema.ts`;
  - #30 owns `apps/web`.
- **Wave 4 runs two slices:**
  - #31 decorates the remaining controllers and adds a route-to-catalog audit. It must come after
    #28 and #29, so the audit can require exactly one handler for every one of the 29 codes.
  - #32 builds the admin screen. It depends on #29's API and on #30's permission hook and nav entry.
- **#33 runs alone in the last wave.** It is the only editor of the narrative docs and the per-app
  agent rules, and it documents the merged code.
- **Glossary edits:** only #26, #27 and #28 touch the glossary family, one per wave, so the
  changelog's appended rows never collide.

## Notes for execution

- **Prerequisite:** commit the design spec, ADR-0023, the glossary-family updates and this plan to
  `main` before `/execute-epic`. The epic branch is cut from `main`, and children read the
  invariants and the spec from their worktrees.
- **Timeout:** #26 (≈60 small edits) and #27 (≈35 files) are the largest slices. Consider
  `AGENT_TIMEOUT=3600` in `.agents/parallel.config` for this epic.
- **DB test tiers:** headless agents run only the DB-free tiers. The DB tiers (`pnpm --filter api
  test:db`) and the migrations should be checked against a local Postgres before merging the
  epic PR.

## Next step

Run `/execute-epic 25`. It does the following:
1. Creates `epic/25-security-module-alignment`.
2. Runs the five waves in order.
3. Passes each child through the review gate before integrating it.
4. Opens one `epic → main` PR.
