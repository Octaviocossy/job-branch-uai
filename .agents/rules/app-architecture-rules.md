# Rule: Per-App Architecture Rules & Config

This rule defines the convention for **per-app agentic configuration** — each app under
`apps/<app>/` carries its own architecture rule(s) and a cross-agent bridge, mirroring the
pattern already used at the repo root. The same bridge applies verbatim to instrumented
packages under `packages/<pkg>/` — see `packages/models` in the index below.

## Layout

```
apps/<app>/.agents/rules/<name>.md   # app-specific architecture rule(s)
apps/<app>/AGENTS.md                  # per-app canonical agent config (OpenCode-discovered)
apps/<app>/CLAUDE.md                  # thin redirect: @AGENTS.md + @.agents/rules/<name>.md
```

The identical layout applies to `packages/<pkg>/.agents/rules/<name>.md`,
`packages/<pkg>/AGENTS.md`, and `packages/<pkg>/CLAUDE.md` — one bridge convention for both
`apps/` and `packages/`.

## Bridge pattern

Each app's `CLAUDE.md` is a thin redirect that `@`-includes its own `AGENTS.md` and its
architecture rule(s), exactly like the root `CLAUDE.md` redirects to the root `AGENTS.md`
and `.agents/rules/`. Claude Code auto-discovers `CLAUDE.md` files by directory when working
inside an app, so no root-level wiring is needed. OpenCode reads the app's `AGENTS.md`
directly.

## Read-before-edit mandate

**Before adding or modifying code in `apps/<app>/`, read that app's architecture rule(s)
under `apps/<app>/.agents/rules/`.** This mirrors the read-before-edit mandate in
`.agents/rules/domain-glossary.md` for domain code.

## Precedence

App-specific rules **refine** — never contradict — root rules (`AGENTS.md`, the shared
`.agents/rules/`, and `.agents/ubiquitous-language.md`). If an app rule conflicts with a
root rule, the root rule wins and the app rule must be corrected.

## Cross-agent applicability

| Agent | Enforcement mechanism |
|-------|-----------------------|
| Claude Code | Per-directory `CLAUDE.md` auto-discovery inside `apps/<app>/`, plus `@.agents/rules/app-architecture-rules.md` inlined in the root `CLAUDE.md` |
| OpenCode | Root `AGENTS.md` › `## Per-App Rules & Config` section, plus each app's own `AGENTS.md` |

## Index of current per-app rules

- `apps/api/.agents/rules/use-case-based-architecture.md` — NestJS use-case (hexagonal) architecture.
- `apps/api/.agents/rules/testing-strategy.md` — 3-tier Vitest split (unit / adapter integration / e2e) and the test-DB contract.
- `apps/web/.agents/rules/nextjs-api-workflow.md` — Next.js App Router API/data-layer workflow.
- `apps/web/.agents/rules/testing-strategy.md` — 2-tier Vitest split (unit / component) for the Next.js frontend.
- `packages/models/.agents/rules/testing-strategy.md` — single node-tier Vitest split; canonical home for Zod schema tests.
