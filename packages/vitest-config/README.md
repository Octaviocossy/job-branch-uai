# @repo/vitest-config

Shared Vitest presets for node- and jsdom/react-tier tests.

## Overview

`@repo/vitest-config` centralizes the [Vitest](https://vitest.dev) setup for the monorepo.
Each workspace merges one of these presets into its own `vitest.config.ts` instead of
redeclaring coverage, globals, and environment options, so every test tier shares the same
baseline. The presets are exposed directly as TypeScript source (`exports: { "./*": "./*.ts" }`
in [`package.json`](package.json)) — there is no build step.

## Available presets

| Preset | Import | Environment | What it configures |
|--------|--------|-------------|--------------------|
| [`base.ts`](base.ts) | `@repo/vitest-config/base` | — | Shared foundation: `globals: true`, `passWithNoTests: true`, and v8 coverage (`text`/`html`/`lcov`, excluding configs, `dist`, `.next`). The other presets merge on top of it. |
| [`node.ts`](node.ts) | `@repo/vitest-config/node` | `node` | `base` + `environment: "node"` — pure logic / schema tests, no DOM. |
| [`react.ts`](react.ts) | `@repo/vitest-config/react` | `jsdom` | `base` + the React plugin, `environment: "jsdom"`, and `setupFiles: ["@repo/vitest-config/setup.react"]`. |
| [`setup.react.ts`](setup.react.ts) | (loaded by `react`) | — | React setup file: registers `@testing-library/jest-dom` matchers globally and, `afterEach`, runs Testing Library `cleanup()`, clears `localStorage`, and resets history. |

## Usage

Add the package as a `workspace:*` devDependency, import the matching preset, and merge it
with any workspace-specific options:

```ts
// apps/web/vitest.config.ts
import { defineConfig, mergeConfig } from "vitest/config";
import react from "@repo/vitest-config/react";

export default mergeConfig(
  react,
  defineConfig({
    test: {
      // workspace-specific options (include globs, aliases, etc.)
    },
  }),
);
```

Who uses which:

- **`apps/web`** → `react` (jsdom, Testing Library component/interaction tests).
- **`@repo/models`** → `node` (Zod schema tests).
- **`apps/api`** → builds on these presets across its unit / integration / e2e tiers.

Because `react` registers `@testing-library/jest-dom` globally via `setup.react.ts`, tests
**must not** re-import `@testing-library/jest-dom` — the matchers (`toBeInTheDocument()`,
etc.) are already available.

## Related docs

- [Root README](../../README.md) — monorepo overview and testing summary.
- [`apps/web` testing strategy](../../apps/web/.agents/rules/testing-strategy.md) — the 2-tier jsdom split.
- [`apps/api` testing strategy](../../apps/api/.agents/rules/testing-strategy.md) — the 3-tier split + test-DB contract.
- [`@repo/models` testing strategy](../models/.agents/rules/testing-strategy.md) — the single node-tier schema suite.
