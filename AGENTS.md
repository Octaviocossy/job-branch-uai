# AGENTS.md

## Design Interrogation
- Before planning anything whose design is not already settled, run `/grill`. Full protocol in
  `.agents/rules/design-interrogation.md`.
- It models the work as a **design tree** and asks the whole **frontier** — every decision whose
  prerequisites are settled — in one numbered round, each question carrying a recommended
  answer, then stops and waits. Facts are the agent's job (dispatch sub-agents); decisions are
  the user's. Done when the frontier is empty.
- Terminology is sharpened **during** the session against the glossary family
  (`.agents/ubiquitous-language*.md`) — see the Active mode section of
  `.agents/rules/domain-glossary.md`.
- Output: a settled **design spec** at `.agents/specs/[yyyy-mm-dd]-[short-kebab-description].md`,
  plus any ADRs raised in `.agents/adr/` (`.agents/rules/adr.md`).
- The spec then routes to `/planning` (local), `/create-issue` (one issue), or
  `/spec-breakdown <spec path>` (3–8 slices). `/spec-breakdown` already accepts a spec file path,
  so no special handoff is needed.
- Never run a design interrogation inside a headless parallel-runner child — there is no human
  to answer.

## Plan Workflow
- When asked to plan or when entering plan mode, follow `.agents/rules/plan-creation.md`.
- Persist plans in `.agents/plans/[yyyy-mm-dd]-[short-kebab-description].md`.
- Present the draft for review before implementation.
- Keep the plan status updated through `draft`, `approved`, `in-progress`, `completed`, or `abandoned`.

## Domain
- The glossary is a **family of six files** (ADR-0016, ADR-0017, ADR-0021). `@`-imported:
  `.agents/ubiquitous-language-index.md` (generated term → area pointers, grouped by file),
  `.agents/ubiquitous-language-invariants.md` (this project's product invariants and
  relationships) and `.agents/ubiquitous-language-invariants-scaffold.md` (the harness's,
  `S`-identified, never edit it) — a breach of either is a hard violation at the review gate.
  This project also `@`-imports its own vocabulary, `.agents/ubiquitous-language.md`. On demand:
  `.agents/ubiquitous-language-scaffold.md` (the harness's, never edit it).
  `.agents/ubiquitous-language-changelog.md` is history, governs nothing.
- Enforcement: `.agents/rules/domain-glossary.md`. Follow without exception.
- Before touching domain code: look the term up in the index, read the file it points at. After,
  write the term in the file that owns it, bump "Last updated", add the changelog row, and
  regenerate the index (`sh .agents/scripts/build-glossary-index.sh .agents/ubiquitous-language-index.md`).
- Decisions outliving the task go in an ADR under `.agents/adr/` — see `.agents/rules/adr.md`.

## Language
- The conversation follows the user's language. Every **artifact** — anything written for a
  later reader: a committed file, a commit message, a GitHub issue, PR or comment, a handoff
  summary, a review report — is written in English, whatever language the work was discussed
  in. Invariant: S20 in `.agents/ubiquitous-language-invariants-scaffold.md`; term: Artifact in
  `.agents/ubiquitous-language-scaffold.md` › Scaffold.
- Paraphrase what the user said in another language; quote it verbatim only when the exact
  wording is itself the subject. No bilingual exception. Generated files (corpus pack, glossary
  index, sync baseline, runner `.diff`) carry whatever their sources carry and are never
  translated.

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
- A **skill** is a procedure the agent loads on its own when the situation matches its
  `description` — as opposed to a slash command, which the user starts. Full conventions in
  `.agents/rules/skill-creation.md`.
- Canonical body: `.agents/skills/<name>/SKILL.md`, surfaced to Claude Code by a relative
  symlink at `.claude/skills/<name>`. OpenCode reads `.agents/skills/` natively; Claude Code
  reads only `.claude/skills/` — hence the symlink. Reasoning in
  `.agents/adr/0001-skills-canonical-in-agents-skills.md`.
- App-specific skills: `apps/<app>/.agents/skills/`
- Package-specific skills: `packages/<pkg>/.agents/skills/`
- Prefer the narrowest ownership boundary that still matches real usage.
- Vendored bodies carry no attribution footer; divergences from upstream live in
  `.agents/adr/0003-vendored-artifacts-carry-no-attribution.md`.
- Available: `turborepo` — Turborepo build-system guidance; fires on `turbo.json`, task
  pipelines, `dependsOn`, caching, the `turbo` CLI, `--filter` / `--affected`.
- Available: `resolving-merge-conflicts` — fires on an in-progress git merge/rebase conflict.
  Finds the intent behind each side, resolves every hunk without inventing behavior, runs the
  project's checks, and finishes the merge.
- Available: `standards-and-spec-review` — fires when a branch needs checking on two axes:
  **Standards** (does it follow `AGENTS.md`, `.agents/rules/`, the glossary, and the ADRs?) and
  **Spec** (does it implement the issue/plan/spec it came from?). Runs the axes as parallel
  sub-agents and reports them side by side without reranking. Deduces the fixed point from the
  branch (epic branch for a child, else `main`). Not a correctness-bug hunt — that is
  `/code-review`.
- Available: `resolving-scaffold-sync` — fires when a scaffold sync has left conflict markers
  in a file or a conflict sidecar beside a path, or `/install-scaffold` exited non-zero naming
  conflicted paths. Establishes what each side was for, resolves every marker without inventing
  behavior, then re-runs the sync and `verify-scaffold.sh`. Not a git merge — nothing to
  `--continue`, and the target need not be a repository.

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
- Available: `grill` — relentless design interrogation; writes a settled spec to `.agents/specs/`, sharpens the glossary inline, and raises ADRs. Run it before `/planning`, `/create-issue`, or `/spec-breakdown` when the design is not yet settled.
- Available: `planning` — create a thorough implementation plan and persist it in `.agents/plans/`.
- Available: `install-scaffold` — sync the cross-agent governance scaffold into a target project
  directory: creates what is absent, updates the scaffold-owned files the target never edited, and
  writes conflict markers — or a `<path>.scaffold-conflict` sidecar beside a path that cannot hold
  them (ADR-0020) — plus a non-zero exit where both sides diverged (ADR-0019).
- Available: `create-issue` — create a GitHub issue with a full implementation plan from a requirement description.
- Available: `update-issue` — correct the body (and optionally the title) of the current branch's GitHub issue when the initial generation was inaccurate; re-derives the issue's labels alongside the body.
- Available: `execute-issue` — execute the current branch's GitHub issue in three phases (confirm, implement, review); uses the linked `.agents/plans/` file as primary plan source if one exists. Phase 3 runs the procedure in `.agents/commands/review-branch.md`; only `skip review` bypasses it.
- Available: `review-branch` — run the two-axis review gate over the current branch's work, committed or not; presents Standards and Spec side by side under a gate line, then loops rework rounds until you approve. The reviewer is dispatched under `REVIEW_AGENT_EXEC_CMD` via `.agents/scripts/run-review-agent.sh`, so it can be a different model than the implementer — **one process per axis**, run concurrently and capped individually by `REVIEW_TIMEOUT` (default 900s), each handed its sources as files rather than as commands to re-run. The canonical interactive gate — `/execute-issue` Phase 3 runs its procedure. User-invocable only.
- Available: `comment-issue` — add a comment to the thread of the GitHub issue for the current branch.
- Available: `ship-note` — post a ship-note of the executed work to the current branch's issue (does not close it).
- Available: `spec-breakdown` — decompose a large spec into an epic issue + N child issues with a dependency graph.
- Available: `execute-epic` — execute an epic's child issues wave-by-wave: each one is pushed, passed through an agentic review, reworked automatically on a hard violation, then integrated into the epic branch; nobody is asked anything. Opens one epic PR at completion.
- Available: `supervise-epic` — the same staged pipeline as `execute-epic`, plus a human approve/reject decision per child at the review gate before it can integrate. User-invocable only — there is no headless equivalent.
- Available: `spec` — one-shot: break a spec into an epic + children, then execute them; `--supervised` at the call site routes execution through `/supervise-epic` instead of the `/execute-epic` default.
- Available: `handoff` — hand this conversation off to a fresh background agent (`claude --bg`) seeded with a summary as its prompt; one detached continuation in this working tree, sandboxed from GitHub unless `with-github`. Claude Code only — OpenCode has no background mode and prints the summary instead.

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
concurrent up to `PARALLEL_MAX_CONCURRENCY` (default 3). A plain run only commits and pushes each
child; it never integrates. Given `--epic <branch>`, three further action flags drive a child
through the rest of the pipeline: `--review` (fans out an agentic `standards-and-spec-review` —
two single-axis reviewer processes per child via `run-review-agent.sh`, ADR-0014 — per
child), `--rework` (re-dispatches a rejected child with feedback), and `--integrate` (the only
action that merges into the epic branch). The orchestrating agent only reads epic-branch state
and opens the final PR via MCP — the runner is the epic branch's sole writer throughout.
`GITHUB_TOKEN` is never sourced by the runner — headless agents have no GitHub access by design.

**The review gate:** every child passes an agentic review before it can integrate, on both
execution paths. `/execute-epic` (auto) resolves it alone — a hard violation blocks integration
and triggers automatic rework, a judgement call never blocks; nobody is asked anything.
`/supervise-epic` runs the identical pipeline plus a human approve/reject decision per child,
informed by the diff, the agent log, and the same agentic report; a hard violation pre-selects
"reject" but the human has the final say. `/spec` defaults to the auto path; pass `--supervised`
at the call site to route it through `/supervise-epic` instead. The runner pre-builds a
**corpus pack** (`.worktrees/.corpus-pack.md`) once per `--review` invocation so the
standards sources are read once rather than once per context, and the caller pre-writes
`.worktrees/.epic-issue.md` so the Spec axis sees the epic's scope headless. Full contract
(the runner's action flags, the rework loop, `REVIEW_AGENT_EXEC_CMD`, `MAX_REWORK_ROUNDS`)
in `.agents/rules/parallel-orchestration.md`.

**Wave flow:** either command creates an epic integration branch `epic/<epic#>-<slug>` and runs
each runnable wave through the full pipeline — push → review → optional rework → integrate — in
one invocation; waves advance with no manual merge step. Each integrated child issue is
**closed** and its branch **deleted** (opt out with `KEEP_CHILD_BRANCHES=1`). At completion it
opens a single `epic → main` PR. Re-running is idempotent (done children are detected from the
epic branch).

**Safety caps:** `MAX_CHILDREN=12`, `AGENT_TIMEOUT=1800s`, `PARALLEL_MAX_CONCURRENCY=3`,
`MAX_REWORK_ROUNDS=2`, `KEEP_CHILD_BRANCHES=0`. Override in `.agents/parallel.config`.

## Code Structure
- **apps/web** — the Next.js 16 (App Router, React 19) frontend app, consuming `@repo/models`.
- **packages/typescript-config** (`@repo/typescript-config`) — shared `tsconfig` bases (`base.json`, `nextjs.json`, `react-library.json`) that all workspace `tsconfig.json` files extend.
- **biome.json** (repo root) — single Biome config for lint + format across the whole workspace (linter `recommended` preset plus `next`/`react` domains, 2-space/double-quote formatter, `.gitignore`-aware via `vcs.useIgnoreFile`). Each app/package's `lint` script runs `biome lint .` scoped to its own directory; formatting is root-only (`pnpm format` / `pnpm format:check`).
