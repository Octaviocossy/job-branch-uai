# @repo/models

Shared Zod domain schemas + inferred TypeScript types, consumed by `apps/api` and `apps/web`.

## Overview

`@repo/models` is the **single source of truth for domain shapes** in the monorepo. It
defines each domain entity once as a [Zod](https://zod.dev) schema and derives its
TypeScript type from that schema, so the NestJS API (`apps/api`) and the Next.js web app
(`apps/web`) validate and type the same contract — no drifting, hand-written duplicate
interfaces.

Today it exports the **User** entity:

| Export | Kind | Description |
|--------|------|-------------|
| `userSchema` | Zod schema | A `User`: `id` (`z.uuid()`), `email` (`z.email()`), `displayName` (`z.string().min(1)`). |
| `createUserSchema` | Zod schema | `userSchema.omit({ id: true })` — the input shape for creating a user. |
| `User` | type | `z.infer<typeof userSchema>`. |
| `CreateUserInput` | type | `z.infer<typeof createUserSchema>`. |

The canonical entity names, fields, and persistence mapping live in the root
[`.agents/ubiquitous-language.md`](../../.agents/ubiquitous-language.md).

## Usage

Add the package as a `workspace:*` dependency of the consuming app, then import schemas
and types directly by name:

```ts
import { userSchema, createUserSchema, type User } from "@repo/models";

// Validate untrusted input
const result = createUserSchema.safeParse(await request.json());

// Use the inferred type
const user: User = userSchema.parse(row);
```

```jsonc
// apps/<app>/package.json
{
  "dependencies": {
    "@repo/models": "workspace:*"
  }
}
```

Consumers import the **built output** (see below), not the TypeScript sources.

## Build output

`@repo/models` is bundled by [`tsup`](https://tsup.egoist.dev) (config:
[`tsup.config.ts`](tsup.config.ts)) into a **dual ESM + CJS** package from the single
entry `src/index.ts`:

| File | Format | Consumed by |
|------|--------|-------------|
| `dist/index.mjs` | ESM | `import` (`apps/web`, ESM tooling) |
| `dist/index.js` | CJS | `require` (`apps/api`, NodeNext CommonJS) |
| `dist/index.d.ts` | Types | Both, via `package.json` `exports` |

The `exports` map in [`package.json`](package.json) routes `import`/`require`/`types` to
the right artifact, so each consumer picks up the format it needs automatically. Only
`src/index.ts` is bundled — test files never reach `dist`.

## Scripts

Run scoped to this package from the repo root:

| Command | What it does |
|---------|--------------|
| `pnpm --filter @repo/models build` | Bundle `src/index.ts` to dual ESM/CJS + `.d.ts` with `tsup` |
| `pnpm --filter @repo/models dev` | Rebuild on change (`tsup --watch`) |
| `pnpm --filter @repo/models lint` | Lint with Biome |
| `pnpm --filter @repo/models format` | Format this package with Biome |
| `pnpm --filter @repo/models check-types` | Type-check with `tsc --noEmit` |
| `pnpm --filter @repo/models test` | Run the Vitest schema suite (`vitest run`) |

## Testing

This package has a **single node-tier Vitest suite** — no DOM, no database, nothing to
split into further tiers — and is the **canonical home for Zod schema tests** in the
repo. Its config (`vitest.config.ts`) merges the [`@repo/vitest-config/node`](../vitest-config)
preset. Tests cover: valid input parses, each field constraint rejects bad input on its
own, and derived-schema relationships (e.g. `createUserSchema` omits exactly `id`).

**Import convention:** relative imports in `src/` (including test files) are
extensionless — `import { userSchema } from "./user.schema"`, not `"./user.schema.js"`.
This package is bundled by `tsup` and its `tsconfig.json` uses `Bundler` module
resolution, so `check-types` and Vitest both resolve bare specifiers (no NodeNext
`.js`-suffix requirement).

App-level usage of a validated result is tested in the consuming app, not here — see the
full contract in [`.agents/rules/testing-strategy.md`](.agents/rules/testing-strategy.md).

## Adding a schema

1. Add the schema to `src/schemas/<entity>.schema.ts` and re-export it from
   `src/index.ts` (with the `.js` extension).
2. Add `src/schemas/<entity>.schema.test.ts` beside it, covering valid parsing, each
   constraint, and any derived-schema relationship.
3. If the schema introduces a new domain entity, state, or process, update the root
   [`.agents/ubiquitous-language.md`](../../.agents/ubiquitous-language.md) and bump its
   "Last updated" date.

## Related docs

- [Root README](../../README.md) — monorepo overview and workspace layout.
- [`AGENTS.md`](AGENTS.md) — canonical, agent-maintained guidance for this package.
- [`.agents/rules/testing-strategy.md`](.agents/rules/testing-strategy.md) — the single-tier schema-test strategy.
- [Root `.agents/ubiquitous-language.md`](../../.agents/ubiquitous-language.md) — the domain glossary.
