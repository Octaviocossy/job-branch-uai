# Rule: Testing Strategy — `@repo/models`

`@repo/models` is a pure Zod-schema package — no DOM, no database, no DI container — so it
has a **single** Vitest tier, unlike `apps/api` (3 tiers) or `apps/web` (2 tiers). One
node-environment config covers everything this package needs to test.

---

## 1. One tier, node environment

- **Config:** `packages/models/vitest.config.ts`, merging `@repo/vitest-config/node` with
  `include: ["src/**/*.test.ts"]`.
- **Command:** `pnpm --filter @repo/models test` runs `vitest run`.
- There is no second tier here — no component/interaction split (that's `apps/web`'s
  concern) and no DB/e2e split (that's `apps/api`'s concern). Schemas have no runtime
  dependencies to fake or isolate.

## 2. What to test

Zod **schema shape and parsing** — this package is the **canonical home** for schema
tests in the repo:

- Valid input parses successfully (`schema.parse(...)` / `.safeParse(...)` returns
  `success: true`).
- Each field's constraint rejects bad input on its own — `z.uuid()` rejects a non-UUID
  string, `z.email()` rejects a non-email string, `.min(1)` rejects an empty string.
- Derived schemas keep their relationship to the base schema — e.g. `createUserSchema =
  userSchema.omit({ id: true })` (`packages/models/src/schemas/user.schema.ts`) should be
  asserted to omit exactly the fields it claims to, not silently drift as the base schema
  changes.

## 3. What NOT to test / cross-reference

- App-level usage of a validated result belongs in the consuming app, not here:
  `apps/api/.agents/rules/testing-strategy.md` (§"Out of scope") and
  `apps/web/.agents/rules/testing-strategy.md` (§6) both defer schema-shape testing back to
  this package — this rule is the other half of that contract.
- Do not re-test schema shape/parsing in an app tier once it's covered here.
- Do not test `zod` itself — trust the library. Test *this repo's* schema definitions
  (the constraints and compositions declared in `packages/models/src/schemas/`), not
  Zod's own validator behavior.

## 4. Naming & placement

- `*.test.ts` lives **beside** the schema it covers, e.g.
  `src/schemas/user.schema.test.ts` next to `src/schemas/user.schema.ts`.
- The config's `include` is `src/**/*.test.ts` — any test file must live under `src/` to
  be picked up.

## 5. NodeNext ESM import quirk

Relative imports in test files need an explicit `.js` extension, matching the convention
already used in `src/index.ts` — e.g. `import { userSchema } from "./user.schema.js"`, not
`"./user.schema"`. Omitting the extension compiles under Vitest's esbuild transform but
fails `check-types` (TS2835) under this package's NodeNext `tsconfig`. Import Vitest
primitives explicitly: `import { describe, expect, it } from "vitest"`.

## 6. No build/type-check leak

`tsup` only bundles `src/index.ts` (per `packages/models/package.json`'s `build` script),
so `*.test.ts` files never reach `dist` — the package's published output is test-free with
no extra config. `check-types` (`tsc --noEmit`) still type-checks test files, because they
live under `src/` alongside the code they test — this is exactly why the `.js`-extension
import rule in §5 matters: `check-types` will fail on a bare specifier even though `vitest
run` would not.

## 7. Headless / CI safety

This tier has no external services — no test database, no browser, no network. `pnpm
--filter @repo/models test` is safe to run unattended in headless or parallel-runner agent
flows (see `.agents/rules/parallel-orchestration.md`); unlike `apps/api`'s `test:int` /
`test:e2e` tiers, there is no "is a Postgres container up?" precondition to check first.

## 8. Adding a new schema

When a new schema is added to `packages/models/src/schemas/`:

1. Add its `*.test.ts` here, covering: valid input parses, each constraint rejects bad
   input on its own, and any derived-schema relationship (`.omit`, `.pick`, `.extend`,
   etc.) holds.
2. If the schema introduces a new domain entity, state, or process, update
   `.agents/ubiquitous-language.md` and bump its "Last updated" date — see
   `.agents/rules/domain-glossary.md`.
