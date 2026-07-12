# AGENTS.md

## Plan Workflow
- When asked to plan or when entering plan mode, follow `.agents/rules/plan-creation.md`.
- Persist plans in `.agents/plans/[yyyy-mm-dd]-[short-kebab-description].md`.
- Present the draft for review before implementation.
- Keep the plan status updated through `draft`, `approved`, `in-progress`, `completed`, or `abandoned`.

## Domain
- The canonical domain glossary lives at `.agents/ubiquitous-language.md`.
- Full enforcement rules are in `.agents/rules/domain-glossary.md`. Follow without exception.
- Read `.agents/ubiquitous-language.md` before writing or reviewing any code that touches domain entities, type names, or data contracts.
- Update the glossary (and bump "Last updated") whenever a new entity, state, or process is introduced.

## Workspace
- Package manager: pnpm@9.0.0 (workspaces: `apps/*`, `packages/*`)
- Node: >=18
- Monorepo: yes — Turborepo (`turbo` ^2.10.4); run commands from the repo root, Turborepo fans them out and caches results.
- Apps: `web` (Next.js 16, App Router, React 19; dev on :3000). Consumes `@repo/models`.
- Packages: `@repo/models` (shared Zod domain schemas), `@repo/typescript-config` (shared tsconfig bases), `@repo/vitest-config` (shared Vitest presets)

## Commands
Run from the repo root; scope to one package with Turborepo's `--filter` (e.g. `turbo build --filter=web`, `turbo lint --filter=@repo/models`).
- Dev: `pnpm dev` (all apps; web on :3000)
- Build: `pnpm build`
- Lint: `pnpm lint` (Biome, `biome lint .` per package via Turborepo)
- Type check: `pnpm check-types` (runs `next typegen && tsc --noEmit`)
- Test: _none configured — no test runner, no `*.test.*`/`*.spec.*` files; the `test` task is registered in `turbo.json`/`pnpm test` so packages can opt in later, but currently no-ops_
- Format: `pnpm format` (Biome `check --write --linter-enabled=false .` — formatter + `organizeImports`, lint off, whole repo); `pnpm format:check` is the read-only mirror (`check --linter-enabled=false .`). Both rely on `biome.json` `files.includes` + `.gitignore`, so no hardcoded path list to keep in sync.

## Verification Quirks
- `check-types` runs `next typegen && tsc --noEmit` for the apps, so type errors can originate from Next's generated route types, not just handwritten code.
- Lint and format are driven by a single root `biome.json` (linter `recommended` preset plus `next`/`react` domains, 2-space/double-quote formatter); there is no per-package Biome config.
- `turbo.json`: `build` and `check-types` depend on `^build` / `^check-types`, so the shared packages (`@repo/models`, the config packages) are built/type-checked before the apps that consume them. `dev` is uncached and persistent; `lint` and `test` rely on Turborepo defaults (no `outputs`/`inputs` override).
- A change in a shared package (`@repo/models` or the shared configs) affects `web` (and any package that consumes them) — verify with an unfiltered run or `--filter=web`, not only the package you edited.
- No test suite exists — never claim tests were run. `pnpm test` / `turbo run test` currently succeeds with a "No tasks were executed" warning since no package defines a `test` script yet.

## Skills
<!-- TODO: document where skills live and any workspace-wide skills already in .agents/skills/ -->
- Workspace-wide skills: `.agents/skills/`
- App-specific skills: `apps/<app>/.agents/skills/`
- Package-specific skills: `packages/<pkg>/.agents/skills/`
- Prefer the narrowest ownership boundary that still matches real usage.

## Per-App Rules & Config
- App-specific architecture rules live at `apps/<app>/.agents/rules/<name>.md`.
- Each app **and instrumented package** carries a canonical `AGENTS.md` and a `CLAUDE.md`
  redirect that `@`-includes it plus its rule(s) — the same bridge pattern as the root files,
  extended verbatim to `packages/<pkg>/`.
- **Before editing code in `apps/<app>/`, read that app's architecture rule(s).**
- Full convention: `.agents/rules/app-architecture-rules.md`.
- Current per-app rules:
  - `apps/api` → `use-case-based-architecture.md` (NestJS use-case / hexagonal layout), `testing-strategy.md` (3-tier Vitest split + test-DB contract)
  - `apps/web` → `nextjs-api-workflow.md` (Next.js App Router data layer), `testing-strategy.md` (2-tier Vitest split: unit / component)
  - `packages/models` → `testing-strategy.md` (single node-tier Vitest; canonical Zod-schema tests)

## Slash Commands
- Cross-agent slash commands (Claude Code + OpenCode) follow `.agents/rules/command-creation.md`.
- Canonical specs live in `.agents/commands/<name>.md`; thin wrappers in `.claude/commands/` and `.opencode/commands/` reference them with identical bodies (only frontmatter differs).
- Invoke in either agent with `/<name>`.
- Available: `commit-message` — generate a Conventional-Commits message from the current diff.
- Available: `planning` — create a thorough implementation plan and persist it in `.agents/plans/`.
- Available: `custom-init` — bootstrap the full cross-agent governance scaffold in the current project.
- Available: `create-issue` — create a GitHub issue with a full implementation plan from a requirement description.
- Available: `update-issue` — correct the body (and optionally the title) of the current branch's GitHub issue when the initial generation was inaccurate.
- Available: `execute-issue` — execute the current branch's GitHub issue in two phases (confirm, implement); uses the linked `.agents/plans/` file as primary plan source if one exists.
- Available: `comment-issue` — add a comment to the thread of the GitHub issue for the current branch.
- Available: `ship-note` — post a ship-note of the executed work to the current branch's issue (does not close it).
- Available: `spec-breakdown` — decompose a large spec into an epic issue + N child issues with a dependency graph.
- Available: `execute-epic` — execute an epic's child issues in parallel, auto-merging each wave into the epic integration branch, then open one epic PR.
- Available: `spec` — one-shot: break a spec into an epic + children, then execute them in parallel.

## GitHub MCP server
- The GitHub issue commands (`create-issue`, `update-issue`, `execute-issue`,
  `comment-issue`, `ship-note`) reach GitHub through the
  **GitHub MCP server**, registered in `.mcp.json` (Claude Code) and `opencode.json` (OpenCode).
- Both registrations point at `.agents/scripts/run-github-mcp.sh`, which sources `.env` and
  launches the official `github-mcp-server` over stdio.
- Install the server binary with `brew install github-mcp-server` (it must be on PATH; the
  script also prepends the Homebrew bin dirs for GUI-launched agents). This replaces the
  deprecated npm package `@modelcontextprotocol/server-github`.
- Set `GITHUB_TOKEN` in `.env` (a GitHub Personal Access Token with `repo` scope). The script
  exposes it to the server as `GITHUB_PERSONAL_ACCESS_TOKEN`.
- Restart the agent after first configuring the token so the MCP server is picked up.

## Parallel Orchestration

Decompose a large spec into an epic + N child issues and execute them in parallel via a POSIX
shell runner. Full conventions in `.agents/rules/parallel-orchestration.md`.

**Epic/child model:** An *epic* is a GitHub issue with a child task-list + ` ```waves ` graph
block, backed by a real, long-lived **epic integration branch** `epic/<epic#>-<slug>`. Each
*child* is a full-plan issue with `> Epic: #<n>` and `> Depends on: #…` headers. Children use
branch names `<issue#>-<kebab-title>` and branch off the epic branch, not `main` directly.

**Setup (one-time):**
1. Copy `.agents/parallel.config.example` → `.agents/parallel.config` (gitignored).
2. Set `AGENT_EXEC_CMD` (default: `claude -p --dangerously-skip-permissions`).
3. Ensure `Build:` and `Test:` in `## Commands` above are filled in — child agents read them.

**Runner:** `.agents/scripts/run-parallel-issues.sh` — one worktree + headless agent per child,
concurrent up to `PARALLEL_MAX_CONCURRENCY` (default 3). The runner commits and pushes each
successful branch, then (given `--epic <branch>`) auto-merges it into the epic integration
branch — the orchestrating agent only reads epic-branch state and opens the final PR via MCP.
`GITHUB_TOKEN` is never sourced by the runner — headless agents have no GitHub access by design.

**Wave flow:** `/execute-epic` creates an epic integration branch `epic/<epic#>-<slug>`, runs
each runnable wave in turn, and the runner **auto-merges each child branch into the epic
branch** — waves advance with no manual merge. Each integrated child issue is **closed** and
its branch **deleted** (opt out with `KEEP_CHILD_BRANCHES=1`). At completion it opens a single
`epic → main` PR. Re-running is idempotent (done children are detected from the epic branch).

**Safety caps:** `MAX_CHILDREN=12`, `AGENT_TIMEOUT=1800s`, `PARALLEL_MAX_CONCURRENCY=3`,
`KEEP_CHILD_BRANCHES=0`. Override in `.agents/parallel.config`.

## Code Structure
- **apps/web** — the Next.js 16 (App Router, React 19) frontend app, consuming `@repo/models`.
- **packages/typescript-config** (`@repo/typescript-config`) — shared `tsconfig` bases (`base.json`, `nextjs.json`, `react-library.json`) that all workspace `tsconfig.json` files extend.
- **biome.json** (repo root) — single Biome config for lint + format across the whole workspace (linter `recommended` preset plus `next`/`react` domains, 2-space/double-quote formatter, `.gitignore`-aware via `vcs.useIgnoreFile`). Each app/package's `lint` script runs `biome lint .` scoped to its own directory; formatting is root-only (`pnpm format` / `pnpm format:check`).
