# Ubiquitous Language

> Single source of truth for domain terminology. Update when entities, relationships,
> or naming conventions change. AI tools should read this before inspecting source files.
>
> **Last updated**: 2026-07-13 (added **Persona**/`PersonaRecruiter`/`Postulante`, `personas` table, and `cv_versions.snapshot_vacante_id` — foundation slice of Epic #18)
> **Canonical types**: `packages/models/src/schemas/`
> **Persistence layer**: `apps/api/src/database/schema/` (Drizzle table definitions mirroring `@repo/models` shapes)
>
> Domain source: the academic deliverable (Parcial N2, Ingeniería de Software, UAI) — its domain
> model (§6) and state machines (§7). Spanish terms below are that deliverable's own vocabulary
> (`Usuario`, `RamaAplicacion`, `VersionPerfil`, …); the canonical Zod/Drizzle identifiers are
> English (`user`, `application`, `cvVersion`, …) except where a field name is kept in Spanish to
> match the source literally (e.g. `esPerfilSalida`, `fechaVencimiento`).

---

## How to maintain this document

1. **Add terms** when a new entity, state, or process enters the codebase.
2. **Add aliases to avoid** when ambiguity appears in PRs, chats, or AI-generated code.
3. **Update relationships** when entity connections change (new FK, removed link, etc.).
4. **Flag ambiguities** when a term means different things in different contexts.
5. **Bump "Last updated"** on every edit so AI tools know how fresh the context is.

---

## Core entities

| Term (SPEC) | Definition | Canonical Zod type | Drizzle table |
|------|-----------|----------------|-----------------|
| **User** (`Usuario`) | Account holder shared by the NestJS API and React client — a `Postulante` or a `Recruiter` (role chosen at registration, immutable per BR-3). Validated via a shared Zod schema; `passwordHash` is persisted but **never** exposed in a `@repo/models` type. | `User` (`userSchema`) in `packages/models/src/schemas/user.schema.ts` | `users` in `apps/api/src/database/schema/users.schema.ts` (`id`, `email` unique, `display_name`, `role`, `password_hash` nullable, `auth_provider` default `native`, `intentos_fallidos` default `0`) |
| **Persona** | The role-specific profile that **composes** a `User` via `usuarioId` (association, not inheritance — matches the domain diagram). Split into two subtypes by a `tipo` discriminant, modeled as a Zod discriminated union: `PersonaRecruiter` (`perNombre`, `perApellido`, `fechaContratacion`) and `Postulante` (`habilidadesMaster`). Created alongside the `User` at registration — behavior lands in issue #21; this slice is schema/table only. | `Persona` / `PersonaRecruiter` / `Postulante` / `CreatePersonaInput` (`personaSchema`, `personaRecruiterSchema`, `postulanteSchema`, `createPersonaSchema`, discriminated on `personaTipoSchema`) in `packages/models/src/schemas/persona.schema.ts` | `personas` in `apps/api/src/database/schema/personas.schema.ts` — single-table-with-discriminator (`usuario_id` FK → `users`, unique; `tipo`; nullable recruiter-only columns `per_nombre`/`per_apellido`/`fecha_contratacion`; `habilidades_master text[]` for postulante) |
| **Auth payloads** | Registration/login/session-issuance request-response shapes (RF14). Not a persisted entity — `registerSchema`/`loginSchema` validate input; `authResponseSchema` shapes the JWT + `User` response; `meResponseSchema` shapes `GET /auth/me`'s `{ user: User, permisos: string[] }` response (the sidebar's current-user source — never includes `passwordHash`). | `RegisterInput`, `LoginInput`, `AuthResponse`, `MeResponse` (`registerSchema`, `loginSchema`, `authResponseSchema`, `meResponseSchema`) in `packages/models/src/schemas/auth.schema.ts` | — (writes to `users.password_hash` / `users.role`) |
| **CvVersion** (`VersionPerfil`) | A labeled, versioned career profile a Postulante can attach a CV/cover-letter file to. Exactly one version per user may be the **Output Profile** (`esPerfilSalida`, BR-5). `archivoCv` is a Postgres `bytea` blob (≤ 10 MB, BR-6). Carries a nullable `snapshotVacanteId` — the `VersionPerfil → Vacante` snapshot reference (populated by the apply/snapshot path, issue #22; existing rows and the borrador-creation flow have no vacante, so it must be optional). | `CvVersion` / `CreateCvVersionInput` (`cvVersionSchema`) in `packages/models/src/schemas/cv-version.schema.ts`; `CreateCvVersionRequest` (`createCvVersionRequestSchema`, client-facing `{ name, focus, tags? }` — the `cv-versions` module's `POST /cv-versions` body; server derives `estado`/`esPerfilSalida`/tags-inheritance, BR-7) in the same file | `cv_versions` in `apps/api/src/database/schema/cv-versions.schema.ts` (`usuario_id` FK → `users`, `name`, `focus`, `tags text[]`, `es_perfil_salida`, `estado`, `archivo_cv bytea`, `tamanio_bytes`, `created_at`, `snapshot_vacante_id` nullable FK → `vacantes`) |
| **Application** (`RamaAplicacion` / "rama" / "branch") | One selection process/pipeline instance: links a `User` to a `Vacante` via the `CvVersion` snapshot used at apply-time (VersionPerfil reference lives on the branch, per professor feedback). Tracks a `timeline` of `Hito` entries. | `Application` / `CreateApplicationInput` (`applicationSchema`) + `applicationStatusSchema` / `PIPELINE_STAGES` in `packages/models/src/schemas/application.schema.ts` (status enum + pipeline order are defined in `hito.schema.ts` to avoid a circular import, and re-used here) | `applications` in `apps/api/src/database/schema/applications.schema.ts` (`usuario_id`, `vacante_id`, `cv_version_id` FKs, `status`, `applied_date`, `last_updated`, `recruiter_*` columns, `tech_stack text[]`, `notes`, `salary`, `location`, `source`, `archived`) |
| **Vacante** | A job posting a `User` applies to, owned by an `Empresa`. | `Vacante` / `CreateVacanteInput` (`vacanteSchema`) in `packages/models/src/schemas/vacante.schema.ts` | `vacantes` in `apps/api/src/database/schema/vacantes.schema.ts` (`empresa_id` FK, `titulo`, `descripcion`, `tecnologias_requeridas text[]`, `rango_salarial`) |
| **Empresa** | The company behind a `Vacante`. | `Empresa` / `CreateEmpresaInput` (`empresaSchema`) in `packages/models/src/schemas/empresa.schema.ts` | `empresas` in `apps/api/src/database/schema/empresas.schema.ts` (`nombre`, `industria`, `sitio_web`, `reputacion_time_response`) |
| **Hito** (`HitoProceso` / `TimelineEvent`) | One milestone/state-change event in an `Application`'s timeline. Carries the `ApplicationStatus` at that point plus optional follow-up metadata. Generates 0..1 `Feedback` and 0..* `Recordatorio`. | `Hito` / `CreateHitoInput` (`hitoSchema`) in `packages/models/src/schemas/hito.schema.ts` | `hitos` in `apps/api/src/database/schema/hitos.schema.ts` (`rama_id` FK → `applications`, `date`, `status`, `note`, `days_in_stage`, `tipo`, `fecha_recordatorio_follow_up`, `observaciones`) |
| **Feedback** (`FeedbackPostMortem`) | Qualitative post-interview data attached to a `Hito` (RF04). | `Feedback` / `CreateFeedbackInput` (`feedbackSchema`) in `packages/models/src/schemas/feedback.schema.ts` | `feedback` in `apps/api/src/database/schema/feedback.schema.ts` (`hito_id` FK → `hitos`, `fecha_entrevista`, `tipo_entrevista`, `score_tecnico`, `score_cultura`, `comentarios`, `habilidades_faltantes text[]`) |
| **Recordatorio** | An anti-ghosting follow-up reminder tied to an `Application` (RF05/RF13). | `Recordatorio` / `CreateRecordatorioInput` (`recordatorioSchema`) in `packages/models/src/schemas/recordatorio.schema.ts` | `recordatorios` in `apps/api/src/database/schema/recordatorios.schema.ts` (`rama_id` FK → `applications`, `fecha_vencimiento`, `dias_inactividad`, `estado` default `pendiente`) |
| **Metrics** (`RendimientoPerfil` / `EstadisticaUsuario`) | Read-only analytics response shapes (RF06/RF10/RF11) computed from the entities above — never persisted directly. Includes per-technology **source distribution** (`SourceDistribution`) and the bundled **analytics overview** (`AnalyticsOverview`) the `apps/api` `analytics` module returns from `GET /analytics/overview` and `apps/web`'s "Analítica" screen renders. | `ProfileRoi`, `Conversion`, `TechHeatmap`, `SkillGap`, `UserStats`, `SourceDistribution`, `AnalyticsOverview` (`profileRoiSchema`, `conversionSchema`, `techHeatmapSchema`, `skillGapSchema`, `userStatsSchema`, `sourceDistributionSchema`, `analyticsOverviewSchema`) in `packages/models/src/schemas/metrics.schema.ts` | — (computed by the `analytics` module's read use-cases (`apps/api/src/modules/analytics/`) over `applications`/`cv_versions`/`hitos`, via its own `AnalyticsReadRepository` — no dependency on the branches module) |
| **FollowupItem** | Read-only anti-ghosting row (RF05/RF12/RF13) for one active `Application`: `daysSince` the last update plus an `urgency` (`ok`/`warn`/`critical`, from configurable `FollowupThresholds`) and the branch's recruiter contact — never persisted directly. Backed by `Recordatorio` rows for "mark as followed up" persistence (`GenerateRemindersUseCase`/`MarkFollowupDoneUseCase` in `apps/api/src/modules/followup/`). | `FollowupItem`, `FollowupThresholds`, `FollowupSummary`, `FollowupListResponse` (`followupItemSchema`, `followupThresholdsSchema`, `followupSummarySchema`, `followupListResponseSchema`, `listFollowupsQuerySchema`) in `packages/models/src/schemas/followup.schema.ts` | — (computed by the `followup` module's own read repository over `applications`/`vacantes`/`empresas`, refreshing `recordatorios`) |
| **ComponentePermiso** / **GrupoPermisos** / **Accion** / **ContextoSeguridad** | The RF15/CU15 hierarchical permission matrix, built with the **Composite** pattern: abstract `ComponentePermiso` (`evaluar(codigoAccion)`, `agregarHijo`, `obtenerHijos`); `GrupoPermisos` composite node (`evaluar` = OR of its children, recursive traversal); `Accion` leaf node (`codigoAccion`, `evaluar` = exact match). `ContextoSeguridad` wraps a role's Composite root (`cargarMatriz`, `tienePermiso`, `listarAcciones`) — SPEC's `Persona.resolverPermisos()`. The tree is built **in-memory per role** by the **Factory** pattern: `MatrizPermisosFactory` interface + `PostulanteMatrizFactory`/`RecruiterMatrizFactory` concretes, selected via `resolverFactory(role)` (Abstract Factory). `ResolverPermisosUseCase` wires factory → `ContextoSeguridad`; `@RequiereAccion('codigo')` + `PermissionsGuard` enforce it per request (BR-4), applied to `GET /security/matrix` and `GET /auth/me`. No DB-backed `PermisosJerarquia`/`PersonaPermisos` tables yet — a documented follow-up. Two additional Composite node kinds sit above `Accion` in the tree — `Formulario` (a form-level grouping) and `Modulo` (a module-level grouping), i.e. `Accion → Formulario → Modulo` — in-memory only, same as the rest of the tree; behavior lands in issue #20 (pre-documented here on its behalf per issue #19). | `PermissionMatrix` (`permissionMatrixSchema`, response `{ role, acciones }`) in `packages/models/src/schemas/permiso.schema.ts`; classes in `apps/api/src/modules/security/domain/` (`componente-permiso.ts`, `grupo-permisos.ts`, `accion.ts`, `contexto-seguridad.ts`) and `apps/api/src/modules/security/application/factories/matriz-permisos.factory.ts` | — (in-memory only for v1, no persistence) |

**Aliases to avoid:** "Rama" alone (ambiguous with `ListaRamas`/`RamaAplicacion` in SPEC prose) — use `Application`/`applications` in code. "Perfil" alone — use `CvVersion`/`cv_versions` (SPEC's `VersionPerfil`). Do not introduce a `passwordHash` field on any `@repo/models` type that isn't `auth.schema.ts`'s internal DB-adjacent shape — `User` never carries it. Bare `recruiterSchema`/`Recruiter` is ambiguous across schema files — `application.schema.ts` already owns those names for the Application's embedded recruiter-**contact** view-model (`{ name, linkedin?, email? }`); the Persona subtype in `persona.schema.ts` uses `personaRecruiterSchema`/`PersonaRecruiter` instead so the `@repo/models` barrel (`export *`) has no ambiguous re-export.

---

## Frontend view-model note

`apps/web` has no separate frontend-only type layer for these entities: it imports the same
`@repo/models` Zod-inferred types (`Application`, `CvVersion`, `Hito`, …) as its view-models,
re-exported through `apps/web/models/index.ts` (`export * from "@repo/models"`). The frontend
view-model shapes (`ApplicationStatus`, `TimelineEvent`, `Recruiter`, `Application`,
`CvVersion`, `PIPELINE_STAGES`) live solely in `@repo/models` (`application.schema.ts` /
`hito.schema.ts`); the wave-3 frontend slices (#9) consume the shared schema rather than
re-declaring these shapes.

---

## Relationships

- `Empresa` **1 --- 0..\*** `Vacante`
- `Vacante` **1 --- 0..\*** `Application`
- `User` (Postulante) **1 --- 0..\*** `CvVersion`
- `User` (Postulante) **1 --- 0..\*** `Application`
- `CvVersion` **1 --- 0..\*** `Application` (snapshot of the version used at apply-time)
- `Application` **1 --- 1..\*** `Hito` (`timeline`)
- `Hito` **1 --- 0..1** `Feedback`
- `Application` **1 --- 0..\*** `Recordatorio`

---

## State machines

### CvVersion.`estado` lifecycle

```
[*] → borrador → (upload PDF/DOCX + save) → disponible
disponible ⇄ seleccionado_salida   ("Establecer como Activo Principal" — demotes any current one, BR-5)
disponible | seleccionado_salida → archivado   (archive outdated/deprecated version)
archivado → disponible   (unarchive)
```

- Guard: cannot leave `borrador` without an attached file (BR-9).
- Guard: at most one `seleccionado_salida` version per user at a time (BR-5).
- `archivado` cannot be used for new `Application`s, but retains its ROI history (BR-10).
- Enum: `cvVersionEstadoSchema` = `["borrador", "disponible", "seleccionado_salida", "archivado"]`.

### Application.`status` lifecycle

```
Enviado → Entrevista Técnica → RRHH → Oferta | Rechazado
```

- Each transition is recorded as a `Hito` in the `Application`'s `timeline`.
- `Oferta` and `Rechazado` are terminal states that allow archiving (`Archivado`, RF09).
- Enum: `applicationStatusSchema` = `["Enviado", "Entrevista Técnica", "RRHH", "Oferta", "Rechazado", "Archivado"]`, defined in `hito.schema.ts`.
- `PIPELINE_STAGES` (kanban column order, excludes the terminal `Archivado` stage) = `["Enviado", "RRHH", "Entrevista Técnica", "Oferta", "Rechazado"]`, defined in `hito.schema.ts`; see Flagged ambiguities below.
- `AddHitoUseCase` (`apps/api/src/modules/branches/application/use-cases/add-hito.use-case.ts`) enforces two guards — a branch already in a `TERMINAL_STATUSES` status (`Oferta`/`Rechazado`/`Archivado`, `apps/api/src/modules/branches/domain/terminal-statuses.ts`) cannot receive another hito, and a hito cannot set `status` to `Archivado` directly (use `POST /branches/:id/archive` instead). Both raise `InvalidStatusTransitionError` (`apps/api/src/modules/branches/domain/errors/invalid-status-transition.error.ts`), mapped to `400` by `BranchesController`. This does **not** enforce stage *order* — see Flagged ambiguities below.

---

## Domain events

| Term | Definition | Payload | Transport |
|------|-----------|---------|-----------|
| **user.created** | Emitted by `CreateUserUseCase` (`apps/api/src/modules/users/application/use-cases/create-user.use-case.ts`) after a **User** is persisted. Consumed by `UserCreatedListener` (`apps/api/src/modules/users/application/listeners/user-created.listener.ts`). | `{ user: User }` — see `USER_CREATED_EVENT` in `apps/api/src/modules/users/domain/events/user-created.event.ts` | In-process, via NestJS `EventEmitter2` (`@nestjs/event-emitter`) |
| **hito.created** | Emitted by `AddHitoUseCase` (`apps/api/src/modules/branches/application/use-cases/add-hito.use-case.ts`) after a **Hito** is appended to an **Application**'s `timeline`. Consumed by `HitoCreatedListener` (`apps/api/src/modules/branches/application/listeners/hito-created.listener.ts`) — currently a no-op/log placeholder for the future `Recordatorio` follow-up scheduling hook. | `{ branchId: string; hito: Hito }` — see `HITO_CREATED_EVENT` in `apps/api/src/modules/branches/domain/events/hito-created.event.ts` | In-process, via NestJS `EventEmitter2` (`@nestjs/event-emitter`) |
| **branch.archived** | Emitted by `ArchiveBranchUseCase` (`apps/api/src/modules/branches/application/use-cases/archive-branch.use-case.ts`) after an **Application** is set to `archived: true` / `status: "Archivado"`. Consumed by `BranchArchivedListener` (`apps/api/src/modules/branches/application/listeners/branch-archived.listener.ts`) — currently a no-op/log placeholder for future analytics-cache invalidation. | `{ branch: Application }` — see `BRANCH_ARCHIVED_EVENT` in `apps/api/src/modules/branches/domain/events/branch-archived.event.ts` | In-process, via NestJS `EventEmitter2` (`@nestjs/event-emitter`) |

---

## Flagged ambiguities

- **`PIPELINE_STAGES` order vs. the documented lifecycle.** The domain lifecycle describes the
  Application flow textually as `Enviado → Entrevista Técnica → RRHH → Oferta | Rechazo`, but the
  kanban column order (`PIPELINE_STAGES` in `hito.schema.ts`) is
  `Enviado → RRHH → Entrevista Técnica → Oferta → Rechazado`. Real seeded applications also move
  through stages in either order in practice (see `apps/api/src/database/seed.ts`). Treat
  `PIPELINE_STAGES` as a **display/board-column order**, not a strict enforced transition
  sequence — no state-machine guard rejects an `Enviado → Entrevista Técnica` jump today.

---

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| [YYYY-MM-DD] | Initial scaffold | Project created |
| 2026-07-11 | Added **User** entity (`@repo/models`) | Shared domain schema introduced by epic #1 / issue #2 |
| 2026-07-11 | Added Drizzle `users` table persisting **User** in `apps/api` | NestJS API scaffold introduced by epic #1 / issue #4 |
| 2026-07-11 | Removed `apps/client`; `apps/web` (Next.js) now consumes the API via TanStack Query + axios | Client superseded by web data layer (epic #15) |
| 2026-07-11 | Added `user.created` domain event (emitted by `CreateUserUseCase`) | Logging/Events made mandatory in apps/api |
| 2026-07-12 | apps/api tsconfig → shared nestjs.json (NodeNext, CJS); relative imports now extensionless | tsconfig consolidation |
| 2026-07-12 | apps/api feature modules relocated to `src/modules/` (`users`, `health`) | Modules-folder convention adopted |
| 2026-07-13 | Reset glossary to the full JobBranch domain: added **Auth payloads**, **CvVersion**, **Application**, **Vacante**, **Empresa**, **Hito**, **Feedback**, **Recordatorio**, **Metrics**; extended **User** with `role`; documented the CvVersion/Application state machines and the frontend view-model note | Epic #1 / issue #2 — foundation models + API persistence + glossary reset |
| 2026-07-13 | Added `createCvVersionRequestSchema`/`CreateCvVersionRequest` (client-facing create body) alongside the existing `createCvVersionSchema`; implemented the `cv-versions` NestJS module (list/create/upload-file/set-output/archive) and the `apps/web` `/profiles` screen | Epic #1 / issue #6 — CV profiles (full-stack) |
| 2026-07-13 | Filled the `apps/api` `branches` module (list/get/create/clone/archive/add-hito/add-feedback use-cases + `DrizzleBranchRepository` denormalizing `applications`/`vacantes`/`empresas`/`hitos`/`cv_versions` into the flat `Application` shape); added `hito.created` and `branch.archived` domain events plus the `AddHitoUseCase` terminal-status / direct-`Archivado` guards | Epic #1 / issue #5 — branch management backend |
| 2026-07-13 | Extended **Metrics** with `SourceDistribution` and `AnalyticsOverview` (`sourceDistributionSchema`, `analyticsOverviewSchema`); implemented the `apps/api` `analytics` module (own `AnalyticsReadRepository` over `applications`/`hitos`/`cv_versions`) and the `apps/web` "Analítica" screen | Epic #1 / issue #7 — analytics (full-stack) |
| 2026-07-13 | Added **FollowupItem** read-model (`@repo/models` `followup.schema.ts`) and the `apps/api` `followup` module (`list-followups`, `generate-reminders`, `mark-followup-done` use-cases over its own `applications`/`vacantes`/`empresas`/`recordatorios` read repository) | Epic #1 / issue #8 — follow-up / anti-ghosting full-stack slice |
| 2026-07-13 | Added the RF15/CU15 permission matrix: **ComponentePermiso**/**GrupoPermisos**/**Accion** Composite tree + **ContextoSeguridad**, built per role by the **MatrizPermisosFactory** Factory (`PostulanteMatrizFactory`/`RecruiterMatrizFactory`); new `apps/api` `security` module (`ResolverPermisosUseCase`, `GET /security/matrix`), `@RequiereAccion`/`PermissionsGuard` enforcement wired onto `GET /security/matrix` and `GET /auth/me`; added `permissionMatrixSchema`/`PermissionMatrix` to `@repo/models` | Epic #1 / issue #10 — security permission matrix (Composite + Factory) [RF15], the canonical home for the two mandatory design patterns |
| 2026-07-13 | Removed the file links to the now-deleted `SPEC.md` and `apps/v0-prototype/lib/data.ts`; glossary is now self-contained (domain attribution kept to the academic deliverable) | `apps/v0-prototype` app + `SPEC.md` removed from the repo |
| 2026-07-13 | Added `meResponseSchema`/`MeResponse` to **Auth payloads**; `GET /auth/me` now resolves the full `User` via `GetUserUseCase` instead of returning the bare JWT payload | Epic #12 / issue #15 — sidebar real user identity, remove Settings, logout |
| 2026-07-13 | Added **Persona**/`PersonaRecruiter`/`Postulante` (`persona.schema.ts`, discriminated union) and the `personas` Drizzle table (composes `User` via `usuario_id`, single-table-with-discriminator); added nullable `snapshotVacanteId`/`snapshot_vacante_id` to **CvVersion**/`cv_versions` (FK → `vacantes`); pre-documented `Formulario`/`Modulo` Composite nodes on **ComponentePermiso** on behalf of issue #20; one combined migration `0002_goofy_strong_guy.sql` | Epic #18 / issue #19 — foundation slice: shared domain models, DB schema + migration, glossary (buildable skeleton, no behavior wired) |
