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
- Derived schemas keep their relationship to the base schema — e.g. `createPersonaSchema`,
  each Persona subtype `.omit({ id: true })`
  (`packages/models/src/schemas/persona.schema.ts`), should be asserted to omit exactly the
  fields it claims to, not silently drift as the base schema changes.

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
  `src/schemas/usuario.schema.test.ts` next to `src/schemas/usuario.schema.ts`.
- The config's `include` is `src/**/*.test.ts` — any test file must live under `src/` to
  be picked up.

## 5. Extensionless relative imports (Bundler resolution)

Relative imports in test files are **extensionless**, matching the convention used in
`src/index.ts` — e.g. `import { usuarioSchema } from "./usuario.schema"`, not
`"./usuario.schema.js"`. This package overrides `module`/`moduleResolution` to `ESNext`/`Bundler`
in its `tsconfig.json` (it is bundled by `tsup`, not emitted by `tsc`), so `check-types`
accepts bare specifiers — a `.js` extension is **not** required and should not be added. Do
not re-introduce the old NodeNext `.js`-suffix convention here. Import Vitest primitives
explicitly: `import { describe, expect, it } from "vitest"`.

## 6. No build/type-check leak

`tsup` only bundles `src/index.ts` (per `packages/models/package.json`'s `build` script),
so `*.test.ts` files never reach `dist` — the package's published output is test-free with
no extra config. `check-types` (`tsc --noEmit`) still type-checks test files, because they
live under `src/` alongside the code they test — so the extensionless-import convention in
§5 applies to them too: under this package's `Bundler` resolution, both `check-types` and
`vitest run` resolve bare specifiers identically.

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
