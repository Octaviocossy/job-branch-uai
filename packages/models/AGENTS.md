# AGENTS.md — packages/models

`@repo/models` — shared Zod-schema domain package consumed by `apps/api` and `apps/web`.
Built by `tsup` into dual ESM (`dist/index.js`) + CJS (`dist/index.cjs`) output with
generated `.d.ts` types.

## Commands

Scoped to this package via Turborepo's `--filter` (run from the repo root):

- Test: `pnpm --filter @repo/models test`
- Build: `pnpm --filter @repo/models build`
- Type check: `pnpm --filter @repo/models check-types`
- Lint: `pnpm --filter @repo/models lint`

## Testing

**Read `.agents/rules/testing-strategy.md` before adding or changing any test file.** In
short: this package has a single node-tier Vitest config (`vitest.config.ts` merging
`@repo/vitest-config/node`) — no DOM, no DB, nothing to split into further tiers. It is the
**canonical home** for Zod schema tests (shape, parsing, per-field constraints, derived
schema relationships); app-level usage of a validated result is tested in the consuming
app instead (`apps/api`, `apps/web`).
