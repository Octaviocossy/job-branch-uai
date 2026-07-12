# @repo/typescript-config

Shared `tsconfig` bases extended by every workspace package.

## Overview

`@repo/typescript-config` is a **pure-JSON** package (no build, no scripts) that centralizes
the TypeScript compiler settings for the whole monorepo. Every workspace `tsconfig.json`
extends one of these bases instead of redeclaring `strict`, module resolution, and target
options, so the compiler behaves consistently across apps and packages.

## Available configs

| Config | Extends | Targets | Extended by |
|--------|---------|---------|-------------|
| [`base.json`](base.json) | — | Shared strict defaults: `strict`, `noUncheckedIndexedAccess`, NodeNext module + resolution, `ES2022`, `isolatedModules`, declaration maps. | Every other base; `@repo/models`, `@repo/vitest-config`. |
| [`nextjs.json`](nextjs.json) | `base.json` | Next.js apps: the `next` TS plugin, `ESNext` module + `Bundler` resolution, `jsx: "preserve"`, `noEmit`, `allowJs`. | `apps/web`. |
| [`nestjs.json`](nestjs.json) | `base.json` | NestJS apps: NodeNext (CommonJS-friendly) + `ES2023`, `emitDecoratorMetadata` / `experimentalDecorators` for DI, `sourceMap`, relaxed `noImplicitAny`. | `apps/api`. |
| [`react-library.json`](react-library.json) | `base.json` | React libraries: `jsx: "react-jsx"` on top of the shared defaults. | React component packages. |

## Usage

Add the package as a `workspace:*` devDependency, then point the consumer's
`tsconfig.json` at the matching base with `extends`:

```jsonc
// apps/web/tsconfig.json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    // only app-specific overrides here — paths, outDir, etc.
  },
  "include": ["."]
}
```

```jsonc
// package.json
{
  "devDependencies": {
    "@repo/typescript-config": "workspace:*"
  }
}
```

## Related docs

- [Root README](../../README.md) — monorepo overview and workspace layout.
