# Ubiquitous Language

> Single source of truth for current domain and technical terminology.
> Read this before changing canonical types, states, processes, or data contracts.
>
> **Last updated:** 2026-10-12
> **Canonical code:** `packages/models/src/schemas/` (Zod types), `apps/api/src/database/schema/` (Drizzle tables), `apps/api/src/modules/*/domain/` (domain classes, events, errors)
> **Budget:** notes 600 · warn 81920 · fail 102400 (bytes)

This file holds **this project's own domain vocabulary** and is **owned by the project**. It is
one of six (ADR-0016, ADR-0017, ADR-0021):

| File | Holds | Owner |
|------|-------|-------|
| `.agents/ubiquitous-language.md` | this project's domain vocabulary | the project |
| `.agents/ubiquitous-language-scaffold.md` | the harness's own vocabulary | the scaffold |
| `.agents/ubiquitous-language-invariants.md` | this project's product invariants and relationships | the project |
| `.agents/ubiquitous-language-invariants-scaffold.md` | the harness's own invariants (`S1`, `S2`, …) | the scaffold |
| `.agents/ubiquitous-language-index.md` | generated term → area pointer table | generated |
| `.agents/ubiquitous-language-changelog.md` | dated history of the family | both |

`CLAUDE.md` `@`-imports the index, both invariants files and this file; the scaffold vocabulary
is read on demand.

Domain source: the academic deliverable (Parcial N2, Ingeniería de Software, UAI) — its domain
model (§6) and state machines (§7). Its Spanish names (`Usuario`, `RamaAplicacion`,
`VersionPerfil`, …) are recorded below as *SPEC* names. Canonical Zod/Drizzle identifiers are
English (`user`, `application`, `cvVersion`, …) except where the source's Spanish is kept
literally (`Vacante`, `Hito`, `esPerfilSalida`, `fechaVencimiento`, …).

---

## How to maintain this document

1. Describe current behavior, not release history or superseded implementations.
2. Add only terminology that clarifies naming, ownership, a data contract, or an invariant.
3. Keep definitions concise and use aliases to prevent recurring ambiguity.
4. Relationships and business-rule guards are invariants: they live in
   `.agents/ubiquitous-language-invariants.md`, cited here by number.
5. Update the date and the changelog (`.agents/ubiquitous-language-changelog.md`) when canonical
   vocabulary or an invariant changes, then regenerate the index.

---

## Glossary

### Identity and access

Who uses the system and in which role. Authentication lives in the `apps/api` `auth` module; the
role profile in `persona`.

| Term | Canonical type | Aliases to avoid | Notes |
|------|----------------|------------------|-------|
| User | `User` (`userSchema`, `user.schema.ts`); table `users` | *Usuario* as a code identifier | SPEC `Usuario`. The account holder shared by `apps/api` and `apps/web`. Its `role` (`postulante` or `recruiter`) is fixed at registration (invariant 2), and it never carries `passwordHash` (invariant 3). |
| Persona | `Persona`, discriminated on `tipo` (`persona.schema.ts`); table `personas`; domain class `Persona` (`modules/persona/domain/persona.ts`) | *User subtype* | The role-specific profile that **composes** a User through `usuarioId` — association, not inheritance — one per User (unique `usuario_id`). Both subtypes share one table with a discriminator. Created together with the User by `RegisterUseCase`. |
| PersonaRecruiter | `PersonaRecruiter` (`personaRecruiterSchema`, `persona.schema.ts`); domain class `Recruiter` | bare `Recruiter` / `recruiterSchema` for this subtype in `@repo/models` | The recruiter subtype of Persona (`perNombre`, `perApellido`, `fechaContratacion`). In `@repo/models` the bare `Recruiter` name belongs to the Recruiter contact, so the barrel (`export *`) never re-exports an ambiguous name. |
| Postulante | `Postulante` (`postulanteSchema`, `persona.schema.ts`); domain class `Postulante` | — | The job-seeker subtype of Persona, carrying `habilidadesMaster`. The role that owns CvVersions and Applications (invariant 1). |
| Auth payloads | `RegisterInput`, `LoginInput`, `AuthResponse`, `MeResponse` (`auth.schema.ts`) | — | Request/response shapes of registration, login and session issuance (RF14); not persisted. `MeResponse` is `GET /auth/me`'s `{ user, permisos }`, the web sidebar's current-user source. |

### Permission matrix

The RF15/CU15 hierarchical permission matrix in `apps/api/src/modules/security/`: a **Composite**
tree per role, built by a **Factory** — the project's two mandatory design patterns. Built in
memory per role; there are no permission tables yet (`PermisosJerarquia`/`PersonaPermisos` are a
documented follow-up).

| Term | Canonical type | Aliases to avoid | Notes |
|------|----------------|------------------|-------|
| ComponentePermiso | abstract class (`domain/componente-permiso.ts`) | — | The Composite component: `evaluar(codigoAccion)`, `agregarHijo`, `obtenerHijos`. Every node of a role's tree is one. |
| GrupoPermisos | composite class (`domain/grupo-permisos.ts`) | — | A node whose `evaluar` is the OR of its children, by recursive traversal. A role's root is one; Modulo and Formulario are its named kinds. |
| Modulo | `Modulo extends GrupoPermisos` (`domain/modulo.ts`) | — | Module-level grouping directly under a role's root, holding that module's Formulario. The tree reads root → Modulo → Formulario → Accion. |
| Formulario | `Formulario extends GrupoPermisos` (`domain/formulario.ts`) | — | Form-level grouping of Accion leaves, under a Modulo. |
| Accion | leaf class (`domain/accion.ts`) | — | One permitted action, identified by `codigoAccion` (e.g. `branch.create`); `evaluar` is an exact match. These codes are what `@RequiereAccion` names (invariant 10). |
| ContextoSeguridad | class (`domain/contexto-seguridad.ts`) | — | Wraps one role's tree: `cargarMatriz`, `tienePermiso`, `listarAcciones`. SPEC's `Persona.resolverPermisos()`. |
| MatrizPermisosFactory | interface + `PostulanteMatrizFactory`, `RecruiterMatrizFactory` (`application/factories/matriz-permisos.factory.ts`) | — | Builds a role's tree (Abstract Factory). `resolverFactory(role)` picks the concrete factory; `ResolverPermisosUseCase` wires its tree into a ContextoSeguridad. |
| PermissionMatrix | `PermissionMatrix` (`permissionMatrixSchema`, `permiso.schema.ts`) | — | The `{ role, acciones }` response of `GET /security/matrix`. |

### Job search

The selection-process model: companies, postings, a Postulante's CV versions and the
applications that track each process.

| Term | Canonical type | Aliases to avoid | Notes |
|------|----------------|------------------|-------|
| Empresa | `Empresa` (`empresaSchema`, `empresa.schema.ts`); table `empresas` | — | The company behind a Vacante. |
| Vacante | `Vacante` (`vacanteSchema`, `vacante.schema.ts`); table `vacantes` | — | A job posting, owned by an Empresa, that Applications apply to. |
| CvVersion | `CvVersion` (`cvVersionSchema`, `cv-version.schema.ts`); table `cv_versions`; API module `cv-versions` | *Perfil* alone; *VersionPerfil* as a code identifier | SPEC `VersionPerfil`. A labeled, versioned career profile of a Postulante, whose CV or cover-letter file is stored in `archivoCv` (`bytea`). `estado` follows the CvVersion lifecycle below. Nullable `snapshotVacanteId` names the Vacante it was snapshotted for, set by `PATCH /cv-versions/:id/snapshot-vacante`. |
| Output Profile | `esPerfilSalida` on CvVersion, with `estado` `seleccionado_salida` | — | The CvVersion a Postulante currently presents, set by `POST /cv-versions/:id/output` ("Establecer como Activo Principal"). Only a `disponible` or `seleccionado_salida` version can become one; at most one per Postulante (invariant 4). |
| CreateCvVersionRequest | `CreateCvVersionRequest` (`createCvVersionRequestSchema`, `cv-version.schema.ts`) | `CreateCvVersionInput` for the request body | The client-facing `POST /cv-versions` body, `{ name, focus, tags? }`; the server derives `estado`, `esPerfilSalida` and tag inheritance (BR-7). `CreateCvVersionInput` is the full persistence input. |
| Application | `Application` (`applicationSchema`, `application.schema.ts`); table `applications`; API module `branches` | *rama* alone; *RamaAplicacion* as a code identifier | SPEC `RamaAplicacion`. One selection process: a Postulante's application to a Vacante through the CvVersion used at apply time, tracked as a `timeline` of Hitos. The API calls it a *branch* (`/branches`, `branch.archived`). |
| ApplicationStatus | `applicationStatusSchema` (defined in `hito.schema.ts`, re-used by `application.schema.ts`) | — | `Enviado`, `Entrevista Técnica`, `RRHH`, `Oferta`, `Rechazado`, `Archivado` — defined beside Hito to avoid a circular import. `Oferta`, `Rechazado` and `Archivado` are terminal (`TERMINAL_STATUSES`, `modules/branches/domain/terminal-statuses.ts`). |
| PIPELINE_STAGES | constant (`hito.schema.ts`) | *transition order* | The kanban column order: `Enviado`, `RRHH`, `Entrevista Técnica`, `Oferta`, `Rechazado` — no `Archivado`. A display order, not an enforced transition sequence (see Flagged ambiguities). |
| Recruiter contact | `Recruiter` (`recruiterSchema`, `application.schema.ts`) | *PersonaRecruiter* | The recruiter's contact details embedded in an Application — `{ name, linkedin?, email? }`, persisted as `applications.recruiter_*`. Not a registered User. |
| Hito | `Hito` (`hitoSchema`, `hito.schema.ts`); table `hitos` | *HitoProceso* as a code identifier | SPEC `HitoProceso`. One milestone in an Application's `timeline`: the ApplicationStatus at that point plus optional follow-up metadata. Appended by `AddHitoUseCase`. |
| Feedback | `Feedback` (`feedbackSchema`, `feedback.schema.ts`); table `feedback` | *FeedbackPostMortem* as a code identifier | SPEC `FeedbackPostMortem`. Qualitative post-interview data attached to a Hito (RF04). |
| Recordatorio | `Recordatorio` (`recordatorioSchema`, `recordatorio.schema.ts`); table `recordatorios` | — | An anti-ghosting follow-up reminder on an Application (RF05/RF13); `estado` starts `pendiente`. |

### Read models

Shapes computed on read and never persisted directly.

| Term | Canonical type | Aliases to avoid | Notes |
|------|----------------|------------------|-------|
| Metrics | `ProfileRoi`, `Conversion`, `TechHeatmap`, `SkillGap`, `UserStats`, `SourceDistribution`, `AnalyticsOverview` (`metrics.schema.ts`) | *RendimientoPerfil*, *EstadisticaUsuario* as code identifiers | SPEC `RendimientoPerfil` / `EstadisticaUsuario`. Analytics shapes (RF06/RF10/RF11) computed by the `analytics` module through its own `AnalyticsReadRepository`, independent of `branches`. `AnalyticsOverview` is the `GET /analytics/overview` bundle the web "Analítica" screen renders. |
| FollowupItem | `FollowupItem`, `FollowupThresholds`, `FollowupSummary`, `FollowupListResponse` (`followup.schema.ts`) | — | One active Application's anti-ghosting row (RF05/RF12/RF13): `daysSince` its last update and an `urgency` (`ok`, `warn`, `critical`) from configurable `FollowupThresholds`, plus the Recruiter contact. "Mark as followed up" persists through Recordatorio rows. |

### Domain events

In-process events over NestJS `EventEmitter2` (`@nestjs/event-emitter`); each event constant and
its payload type live under the emitting module's `domain/events/`.

| Term | Canonical type | Aliases to avoid | Notes |
|------|----------------|------------------|-------|
| user.created | `USER_CREATED_EVENT`, payload `{ user: User }` (`modules/users/domain/events/user-created.event.ts`) | — | Emitted by `CreateUserUseCase` after a User is persisted; consumed by `UserCreatedListener`. |
| hito.created | `HITO_CREATED_EVENT`, payload `{ branchId, hito }` (`modules/branches/domain/events/hito-created.event.ts`) | — | Emitted by `AddHitoUseCase` after a Hito is appended. `HitoCreatedListener` only logs today — the hook for future Recordatorio scheduling. |
| branch.archived | `BRANCH_ARCHIVED_EVENT`, payload `{ branch: Application }` (`modules/branches/domain/events/branch-archived.event.ts`) | — | Emitted by `ArchiveBranchUseCase` after an Application is archived. `BranchArchivedListener` only logs today — the hook for future analytics-cache invalidation. |

---

## State machines

### CvVersion `estado` (`cvVersionEstadoSchema`)

```
[*] → borrador → (file attached + saved) → disponible
disponible ⇄ seleccionado_salida      (Output Profile; demotes the current one)
disponible | seleccionado_salida → archivado
archivado → disponible                 (unarchive)
```

Guards: invariants 4–7.

### Application `status` (`applicationStatusSchema`)

```
Enviado → Entrevista Técnica → RRHH → Oferta | Rechazado
```

Each transition is recorded as a Hito (invariant 8). `Oferta` and `Rechazado` are terminal and
allow archiving (`Archivado`, RF09); the terminal-status guards are invariant 9. Stage *order*
is not enforced — see Flagged ambiguities.

---

## Flagged ambiguities

- **`PIPELINE_STAGES` order vs. the documented lifecycle.** The domain lifecycle describes the
  Application flow textually as `Enviado → Entrevista Técnica → RRHH → Oferta | Rechazo`, but the kanban
  column order (`PIPELINE_STAGES` in `hito.schema.ts`) is
  `Enviado → RRHH → Entrevista Técnica → Oferta → Rechazado`. Seeded applications move through
  stages in either order (`apps/api/src/database/seed.ts`). Treat `PIPELINE_STAGES` as a
  **display/board-column order**, not an enforced transition sequence — no guard rejects an
  `Enviado → Entrevista Técnica` jump today.
