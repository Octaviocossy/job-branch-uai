# Ubiquitous Language

> Single source of truth for current domain and technical terminology.
> Read this before changing canonical types, states, processes, or data contracts.
>
> **Last updated:** 2026-10-13
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

Domain source: the academic deliverable's latest iteration — UAI *Trabajo de Diploma*, Evaluación
Parcial 1, document v8.0 of 2026-09-27, which consolidates iterations A–C and adds iteration D; it
is the project's source of truth. Domain model in §17.4 and §18.2, state machines in §14, detailed
design in §19, data model in §20.2. Its Spanish names (`Usuario`, `RamaAplicacion`,
`VersionPerfil`, …) are recorded below as *SPEC* names. Canonical Zod/Drizzle identifiers are
English (`application`, `cvVersion`, …) except where the source's Spanish is kept literally
(`Vacante`, `Hito`, `esPerfilSalida`, `fechaVencimiento`, …) — and in the security and identity
scope, whose classes take the spec's names (`Usuario`, `ListaUsuarios`, `nombreCompleto`;
ADR-0023).

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
| Usuario | `Usuario` (`usuarioSchema`, `@repo/models`); domain entity `Usuario` (`modules/users/domain/`); table `usuarios` | *User* as a code identifier | SPEC `Usuario` (19.13). The account holder (`nombreCompleto`, `email`, `authProvider`, `intentosFallidos`) shared by `apps/api` and `apps/web`, able to `autenticar(password)` and `incrementarIntentos()`. It stores no role: `obtenerRol()` returns its Persona's `tipo` (invariant 2). |
| Persona | `Persona`, discriminated on `tipo` (`persona.schema.ts`); table `personas`; domain class `Persona` (`modules/persona/domain/persona.ts`) | *Usuario subtype* | The role-specific profile that **composes** a Usuario through `usuarioId` — association, not inheritance — one per Usuario (unique `usuario_id`). Its three subtypes share one table with a discriminator. `RegisterUseCase` creates it with its Usuario, except an Administrador, which only the seed creates. |
| PersonaRecruiter | `PersonaRecruiter` (`personaRecruiterSchema`, `persona.schema.ts`); domain class `Recruiter` | bare `Recruiter` / `recruiterSchema` for this subtype in `@repo/models` | The recruiter subtype of Persona (`perNombre`, `perApellido`, `fechaContratacion`). In `@repo/models` the bare `Recruiter` name belongs to the Recruiter contact, so the barrel (`export *`) never re-exports an ambiguous name. |
| Postulante | `Postulante` (`postulanteSchema`, `persona.schema.ts`); domain class `Postulante` | — | The job-seeker subtype of Persona, carrying `habilidadesMaster`. The role that owns CvVersions and Applications (invariant 1). |
| Administrador | `Administrador` (`administradorSchema`, `persona.schema.ts`); domain class `Administrador` | *admin role*, *superuser* | The third Persona subtype (SPEC 18.10), created only by the seed, never by registration. It holds the matrix-management group (CU-15) and the administration of ListaUsuarios. |
| Auth payloads | `RegisterInput`, `LoginInput`, `AuthResponse`, `MeResponse` (`auth.schema.ts`) | — | Request/response shapes of registration, login and session issuance (RF14); not persisted. `MeResponse` is `GET /auth/me`'s `{ user, permisos }`, the web sidebar's current-user source. |
| Sesion | `Sesion` entity (SPEC 18.10); table `sesiones` | *JWT*, *token* for the session itself | A Usuario's persisted login session (`tokenJWT`, `fechaEmision`, `fechaExpiracion`): created at login, required to be live on every authenticated request, and the initializer of its ContextoSeguridad. The JWT is only the credential that names it (invariant 14). |
| ListaUsuarios | `ListaUsuarios` port (`modules/users/domain/`) | *UserRepository* | The «Catálogo» of Usuarios (SPEC 19.13): `agregarUsuario`, `buscarPorEmail`. A query about users goes to the catalog, never to a single Usuario. |

### Permission matrix

The RF15/CU15 hierarchical permission matrix in `apps/api/src/modules/security/`: a **Composite**
tree of persisted, shared nodes, of which each Persona holds one or more roots (invariant 12),
seeded and handed out per role by a **Factory** — the project's two mandatory design patterns.
Formulario and Modulo are associated with the tree's Acciones, not part of the tree.

| Term | Canonical type | Aliases to avoid | Notes |
|------|----------------|------------------|-------|
| ComponentePermiso | abstract class (`domain/componente-permiso.ts`) | — | The Composite component: `evaluar(codigoAccion)`, `agregar`, `remover`, `obtenerHijos`. Nodes are shared: a node has at most one parent, yet any number of Personas may hold it as a root. |
| GrupoPermisos | composite class (`domain/grupo-permisos.ts`) | *Modulo*, *Formulario* as group kinds | A node with a `descripcion` and its `hijos`, whose `evaluar` is the OR of its children by recursive traversal. Every interior node of a tree is a plain GrupoPermisos. |
| Modulo | class (`domain/modulo.ts`) | *permission group* | A module of the application (`id`, `nombre`) that owns Formularios. Not a ComponentePermiso: it sits outside the tree and grants nothing. |
| Formulario | class (`domain/formulario.ts`) | *permission group* | A form of one Modulo (`id`, `nombre`) where Acciones execute. Not a ComponentePermiso: an Accion points to its Formulario; the Formulario never contains it in the tree. |
| Accion | leaf class (`domain/accion.ts`) | — | One permitted action, identified by `codigoAccion` (e.g. `branch.create`) and executed in one Formulario; `evaluar` is an exact code match. There is one per protected endpoint, seeded ahead of the endpoints that do not exist yet and fixed by the seed: administrators group Acciones but never create them (invariant 10). |
| ContextoSeguridad | class (`domain/contexto-seguridad.ts`) | — | Holds the permission tree of a Sesion's Persona and answers for it: `cargarMatriz`, `tienePermiso`, `listarAcciones`. The Sesion initializes it; SPEC `Persona.resolverPermisos()` supplies its roots and is not the context itself. |
| MatrizPermisosFactory | interface + `PostulanteMatrizFactory`, `RecruiterMatrizFactory`, `AdministradorMatrizFactory` (`application/factories/matriz-permisos.factory.ts`) | — | One factory per role (Abstract Factory) defining that role's default roots: it seeds the shared groups when missing and hands a newly registered Persona its role's default roots — a set of shared groups (invariant 12). It builds no runtime tree — a Sesion's tree is loaded from the database. |
| PermissionMatrix | `PermissionMatrix` (`permissionMatrixSchema`, `permiso.schema.ts`) | — | The response of `GET /security/matrix`: the caller's permitted Acciones grouped by Modulo and Formulario. |

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
| Recruiter contact | `Recruiter` (`recruiterSchema`, `application.schema.ts`) | *PersonaRecruiter* | The recruiter's contact details embedded in an Application — `{ name, linkedin?, email? }`, persisted as `applications.recruiter_*`. Not a registered Usuario. |
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
| user.created | `USER_CREATED_EVENT`, payload `{ user: Usuario }` (`modules/users/domain/events/user-created.event.ts`) | — | Emitted by `RegisterUseCase` after a Usuario is persisted; consumed by `UserCreatedListener`. |
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
