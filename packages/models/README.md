# @repo/models

Shared Zod domain schemas + inferred TypeScript types, consumed by `apps/api` and `apps/web`.

## Overview

`@repo/models` is the **single source of truth for domain shapes** in the monorepo. It
defines each domain entity once as a [Zod](https://zod.dev) schema and derives its
TypeScript type from that schema, so the NestJS API (`apps/api`) and the Next.js web app
(`apps/web`) validate and type the same contract — no drifting, hand-written duplicate
interfaces.

It holds one `src/schemas/<entity>.schema.ts` per domain entity or API contract. The identity
and security schemas are:

| Schema file | Exports | Description |
|-------------|---------|-------------|
| `usuario.schema.ts` | `usuarioSchema`, `Usuario` | The account: `id` (`z.uuid()`), `email` (`z.email()`), `nombreCompleto`, `authProvider`, `intentosFallidos`. It carries **no role** (the role is the Persona's `tipo`) and **no `passwordHash`** — that never leaves `apps/api`. |
| `auth.schema.ts` | `registerRoleSchema`, `registerSchema`, `loginSchema`, `authResponseSchema`, `meResponseSchema` and their types | The auth payloads. `registerRoleSchema` is `postulante` \| `recruiter` — **never `administrador`**, which only the seed creates. `AuthResponse` is `{ token, user }`; `MeResponse` is `{ user, permisos }`, `permisos` being the `codigoAccion` values the session's permission tree holds — what `apps/web` filters its menu and buttons by. |
| `persona.schema.ts` | `personaTipoSchema`, `personaSchema`, `createPersonaSchema` and the three subtypes | The role-specific profile composing a `Usuario`, a discriminated union on `tipo`: `personaRecruiterSchema`/`PersonaRecruiter`, `postulanteSchema`/`Postulante` and `administradorSchema`/`Administrador`. The recruiter subtype is named `personaRecruiterSchema`/`PersonaRecruiter`, not `recruiterSchema`/`Recruiter`, to avoid colliding with `application.schema.ts`'s recruiter-contact view-model. |
| `permiso.schema.ts` | `permissionMatrixSchema`, `catalogoMatrizSchema`, `grupoPermisosSchema`, `createGrupoPermisosSchema`, `updateGrupoPermisosSchema`, `personaRaicesSchema`, `asignarRaizSchema` and their types | The permission-matrix contracts: `PermissionMatrix` is `GET /security/matrix` (`{ role, modulos }`, the caller's permitted Acciones grouped by Modulo and Formulario); `CatalogoMatriz` is `GET /security/catalog`; the rest are the Administrador's group and root-assignment endpoints (`GrupoPermisos`, `PersonaRaices`). |

The other schemas (`application`, `cv-version`, `empresa`, `vacante`, `hito`, `feedback`,
`recordatorio`, `followup`, `metrics`) cover the job-search domain; `cv-version.schema.ts`'s
`cvVersionSchema` carries a `snapshotVacanteId` (nullable `z.uuid()`) — the `VersionPerfil →
Vacante` snapshot reference. In the security and identity scope the names are the academic spec's
(`Usuario`, `nombreCompleto`), per [ADR-0023](../../.agents/adr/0023-code-follows-the-spec-class-diagram-first.md).

The canonical entity names, fields, and persistence mapping live in the root
[`.agents/ubiquitous-language.md`](../../.agents/ubiquitous-language.md).

## Usage

Add the package as a `workspace:*` dependency of the consuming app, then import schemas
and types directly by name:

```ts
import { registerSchema, usuarioSchema, type Usuario } from "@repo/models";

// Validate untrusted input
const result = registerSchema.safeParse(await request.json());

// Use the inferred type
const usuario: Usuario = usuarioSchema.parse(row);
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
own, and invariants a schema carries (e.g. `registerSchema` rejects the role `administrador`,
and the registration payload never carries a `passwordHash`).

**Import convention:** relative imports in `src/` (including test files) are
extensionless — `import { usuarioSchema } from "./usuario.schema"`, not `"./usuario.schema.js"`.
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
