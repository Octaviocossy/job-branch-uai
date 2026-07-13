# Ubiquitous Language

> Single source of truth for domain terminology. Update when entities, relationships,
> or naming conventions change. AI tools should read this before inspecting source files.
>
> **Last updated**: 2026-07-13 (branches backend)
> **Canonical types**: `packages/models/src/schemas/`
> **Persistence layer**: `apps/api/src/database/schema/` (Drizzle table definitions mirroring `@repo/models` shapes)
>
> Domain source: `SPEC.md` §6 (Domain Model) and §7 (State Machines). Spanish terms below are the
> SPEC's own vocabulary (`Usuario`, `RamaAplicacion`, `VersionPerfil`, …); the canonical Zod/Drizzle
> identifiers are English (`user`, `application`, `cvVersion`, …) except where a field name is kept
> in Spanish to match the SPEC literally (e.g. `esPerfilSalida`, `fechaVencimiento`).

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
| **Auth payloads** | Registration/login/session-issuance request-response shapes (RF14). Not a persisted entity — `registerSchema`/`loginSchema` validate input; `authResponseSchema` shapes the JWT + `User` response. Login/register endpoints ship in epic child #4; this foundation only scaffolds the JWT verify guard. | `RegisterInput`, `LoginInput`, `AuthResponse` (`registerSchema`, `loginSchema`, `authResponseSchema`) in `packages/models/src/schemas/auth.schema.ts` | — (writes to `users.password_hash` / `users.role`) |
| **CvVersion** (`VersionPerfil`) | A labeled, versioned career profile a Postulante can attach a CV/cover-letter file to. Exactly one version per user may be the **Output Profile** (`esPerfilSalida`, BR-5). `archivoCv` is a Postgres `bytea` blob (≤ 10 MB, BR-6). | `CvVersion` / `CreateCvVersionInput` (`cvVersionSchema`) in `packages/models/src/schemas/cv-version.schema.ts`; `CreateCvVersionRequest` (`createCvVersionRequestSchema`, client-facing `{ name, focus, tags? }` — the `cv-versions` module's `POST /cv-versions` body; server derives `estado`/`esPerfilSalida`/tags-inheritance, BR-7) in the same file | `cv_versions` in `apps/api/src/database/schema/cv-versions.schema.ts` (`usuario_id` FK → `users`, `name`, `focus`, `tags text[]`, `es_perfil_salida`, `estado`, `archivo_cv bytea`, `tamanio_bytes`, `created_at`) |
| **Application** (`RamaAplicacion` / "rama" / "branch") | One selection process/pipeline instance: links a `User` to a `Vacante` via the `CvVersion` snapshot used at apply-time (VersionPerfil reference lives on the branch, per professor feedback). Tracks a `timeline` of `Hito` entries. | `Application` / `CreateApplicationInput` (`applicationSchema`) + `applicationStatusSchema` / `PIPELINE_STAGES` in `packages/models/src/schemas/application.schema.ts` (status enum + pipeline order are defined in `hito.schema.ts` to avoid a circular import, and re-used here) | `applications` in `apps/api/src/database/schema/applications.schema.ts` (`usuario_id`, `vacante_id`, `cv_version_id` FKs, `status`, `applied_date`, `last_updated`, `recruiter_*` columns, `tech_stack text[]`, `notes`, `salary`, `location`, `source`, `archived`) |
| **Vacante** | A job posting a `User` applies to, owned by an `Empresa`. | `Vacante` / `CreateVacanteInput` (`vacanteSchema`) in `packages/models/src/schemas/vacante.schema.ts` | `vacantes` in `apps/api/src/database/schema/vacantes.schema.ts` (`empresa_id` FK, `titulo`, `descripcion`, `tecnologias_requeridas text[]`, `rango_salarial`) |
| **Empresa** | The company behind a `Vacante`. | `Empresa` / `CreateEmpresaInput` (`empresaSchema`) in `packages/models/src/schemas/empresa.schema.ts` | `empresas` in `apps/api/src/database/schema/empresas.schema.ts` (`nombre`, `industria`, `sitio_web`, `reputacion_time_response`) |
| **Hito** (`HitoProceso` / `TimelineEvent`) | One milestone/state-change event in an `Application`'s timeline. Carries the `ApplicationStatus` at that point plus optional follow-up metadata. Generates 0..1 `Feedback` and 0..* `Recordatorio`. | `Hito` / `CreateHitoInput` (`hitoSchema`) in `packages/models/src/schemas/hito.schema.ts` | `hitos` in `apps/api/src/database/schema/hitos.schema.ts` (`rama_id` FK → `applications`, `date`, `status`, `note`, `days_in_stage`, `tipo`, `fecha_recordatorio_follow_up`, `observaciones`) |
| **Feedback** (`FeedbackPostMortem`) | Qualitative post-interview data attached to a `Hito` (RF04). | `Feedback` / `CreateFeedbackInput` (`feedbackSchema`) in `packages/models/src/schemas/feedback.schema.ts` | `feedback` in `apps/api/src/database/schema/feedback.schema.ts` (`hito_id` FK → `hitos`, `fecha_entrevista`, `tipo_entrevista`, `score_tecnico`, `score_cultura`, `comentarios`, `habilidades_faltantes text[]`) |
| **Recordatorio** | An anti-ghosting follow-up reminder tied to an `Application` (RF05/RF13). | `Recordatorio` / `CreateRecordatorioInput` (`recordatorioSchema`) in `packages/models/src/schemas/recordatorio.schema.ts` | `recordatorios` in `apps/api/src/database/schema/recordatorios.schema.ts` (`rama_id` FK → `applications`, `fecha_vencimiento`, `dias_inactividad`, `estado` default `pendiente`) |
| **Metrics** (`RendimientoPerfil` / `EstadisticaUsuario`) | Read-only analytics response shapes (RF06/RF10/RF11) computed from the entities above — never persisted directly. | `ProfileRoi`, `Conversion`, `TechHeatmap`, `SkillGap`, `UserStats` (`profileRoiSchema`, `conversionSchema`, `techHeatmapSchema`, `skillGapSchema`, `userStatsSchema`) in `packages/models/src/schemas/metrics.schema.ts` | — (computed by wave-2 analytics read use-cases over `applications`/`cv_versions`/`hitos`) |

**Aliases to avoid:** "Rama" alone (ambiguous with `ListaRamas`/`RamaAplicacion` in SPEC prose) — use `Application`/`applications` in code. "Perfil" alone — use `CvVersion`/`cv_versions` (SPEC's `VersionPerfil`). Do not introduce a `passwordHash` field on any `@repo/models` type that isn't `auth.schema.ts`'s internal DB-adjacent shape — `User` never carries it.

---

## Frontend view-model note

`apps/web` has no separate frontend-only type layer for these entities: it imports the same
`@repo/models` Zod-inferred types (`Application`, `CvVersion`, `Hito`, …) as its view-models,
re-exported through `apps/web/models/index.ts` (`export * from "@repo/models"`). The ported
prototype types in `apps/v0-prototype/lib/data.ts` (`ApplicationStatus`, `TimelineEvent`,
`Recruiter`, `Application`, `CvVersion`, `PIPELINE_STAGES`) map 1:1 onto `application.schema.ts`
/ `hito.schema.ts` — wave-3 frontend slices (#9) consume the shared schema instead of
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

## State machines (SPEC §7)

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
- `PIPELINE_STAGES` (kanban column order, excludes the terminal `Archivado` stage) = `["Enviado", "RRHH", "Entrevista Técnica", "Oferta", "Rechazado"]` — ported verbatim from `apps/v0-prototype/lib/data.ts`; see Flagged ambiguities below.
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

- **`PIPELINE_STAGES` order vs. SPEC §7.2 prose.** SPEC §7.2 describes the Application lifecycle
  textually as `Enviado → Entrevista Técnica → RRHH → Oferta | Rechazo`, but the ported
  prototype's kanban column order (`PIPELINE_STAGES` in `hito.schema.ts`, matching
  `apps/v0-prototype/lib/data.ts`) is `Enviado → RRHH → Entrevista Técnica → Oferta → Rechazado`.
  Real seeded applications also move through stages in either order in practice (see
  `apps/api/src/database/seed.ts`). Treat `PIPELINE_STAGES` as a **display/board-column order**,
  not a strict enforced transition sequence — no state-machine guard rejects an
  `Enviado → Entrevista Técnica` jump today.

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
