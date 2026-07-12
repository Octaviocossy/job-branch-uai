# README house style

The shared conventions every README in this monorepo follows — the root
[`README.md`](../README.md) and each per-project README (`apps/*`, `packages/*`). Keep the
docs consistent so a reader who has seen one knows how to read them all.

## Structure

- **H1 = the project/package display name.** Use the repo/package identity, e.g.
  `# fullstack-turborepo`, `# @repo/models`, `# apps/api`.
- **One-sentence tagline directly under the H1** — what the project is, in a single line.
- **Canonical section order** (omit a section only when it truly does not apply):
  1. **Overview** — what it is and how it fits into the monorepo.
  2. **Tech stack** — the libraries/tools it uses (compact list or table).
  3. **Structure / Layout** — the folders and what each holds.
  4. **Getting started** (apps) or **Usage** (library packages) — the happy-path setup or
     import example.
  5. **Scripts / Commands** — a table of the real scripts (see below).
  6. **Architecture & conventions** — a short paragraph linking `AGENTS.md` and the
     relevant `.agents/rules/*`, never restating them.
  7. **Testing** — the test tiers and how to run them.
  8. **Related docs** — bullet links to sibling docs.

## Commands as a table

Show scripts as a two-column table, using the repo's **real** scripts:

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Start all apps in watch mode |

- Root scripts run from the repo root: `pnpm dev`, `pnpm build`, `pnpm lint`, …
- Scope a script to one workspace with a filter: `pnpm --filter <name> <script>` (e.g.
  `pnpm --filter web dev`), or run any Turborepo task scoped with
  `turbo <task> --filter=<name>`.

## Linking, not duplicating

- Every README **summarizes and links** the canonical `AGENTS.md` / `.agents/rules/*` — it
  must **not** copy their full text. `AGENTS.md` and `.agents/` are the agent-maintained
  source of truth; a README that duplicates them will drift.
- Use **relative links only**, e.g. `[apps/web](../apps/web/README.md)`, and every link
  must resolve to a real path on the current branch. If a sibling README does not exist
  yet, link to the **directory** that does (e.g. `[apps/web](../apps/web)`).

## Tone

Concise, technical, present-tense. Prefer a table or a short list over prose; assume the
reader is a developer, not a newcomer to the stack.
