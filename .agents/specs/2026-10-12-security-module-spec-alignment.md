# Spec: Align the security module with spec v8.0

> Status: **settled**
> Created: 2026-10-12
> Grilled: 2026-10-12 — 4 rounds, 26 decisions + 6 derived consequences confirmed at close
> Suggested next: /spec-breakdown

## Goal

Bring the security module — the permission matrix, session and identity, and how permissions are
enforced across `apps/api` and `apps/web` — in line with the latest iteration of the academic
spec (UAI *Trabajo de Diploma*, Evaluación Parcial 1, document v8.0 of 2026-09-27), which the
project treats as its source of truth, and record the document's own contradictions as errata.

## Settled Decisions

| # | Decision | Chosen | Rationale |
|---|----------|--------|-----------|
| 1 | What is the source of truth? | The deliverable's latest iteration, document v8.0 | Stated by the user: the latest iteration is the project's source of truth |
| 2 | When code and spec differ, which one moves? | The code; a figure contradicting the governing one is recorded as an erratum, never implemented | Follows from 1 |
| 3 | Which figure governs security when v8.0's figures contradict each other? | Class diagram 19.13; what it does not draw comes from the data model 20.1, the sequences 19.1–19.2 and the methods view 18.10 | Iteration D redraws no security class; 19.13 is the last refinement of the document's ICONIX chain and answers the Parcial 2 review |
| 4 | What happens to the figures that lose? | Listed as errata in this spec, for the document's next version | Keeps the document consistent without ever implementing the losing reading |
| 5 | What counts as the security module here? | S1 Composite structure, S2 matrix holder and persistence, S3 session and identity, S4 permission enforcement | The domain comparison and RF15's "prevent unauthorized actions" both land in these four |
| 6 | Does the evaluations module (iteration D) enter? | No; the matrix only has to be able to host its permissions | The module does not exist in code; it gets its own design |
| 7 | What does the glossary cite as domain source? | v8.0 with its section numbers, for the whole glossary | Follows from 1 |
| 8 | Are Formulario and Modulo nodes of the Composite? | No: associated classes outside the tree — `Accion *—1 Formulario *—1 Modulo` | 20.1 and 18.10 fill 19.13's gap; reverses epic #18 (#20) |
| 9 | Code names or spec names? | The spec's literal names | So the code reads name for name against the class diagram (ADR-0023) |
| 10 | Where does the matrix live? | Persisted and shared: `componentes` (self-referencing parent, `tipo`, `nombre`, `descripcion`, `codigoAccion`, Formulario reference), `formularios`, `modulos`, and a join holding each Persona's 1..* roots | 19.13's association, 19.14's `findArbolByPersona` and 20.1's tables; sharing avoids a copy of every group per Persona |
| 11 | Is the session an entity? | Yes: persisted Sesion (`tokenJWT`, `fechaEmision`, `fechaExpiracion`); every authenticated request needs a live Sesion; the Sesion initializes the ContextoSeguridad | 20.1's table, 19.1's creation and 18.10's initialization; enables logout and revocation |
| 12 | Which Usuario methods from 19.13? | A domain entity Usuario with `autenticar(password)` (through a hashing port) and `incrementarIntentos()`, orchestrated by `LoginUseCase` | `pertenece()`, `tiene()` and `evaluaPermisos()` are association names drawn as `void` methods: errata |
| 13 | Which role holds which actions? | The CU actors, strictly: Recruiter — pipeline (CU-02, 06, 07, 08, 09) and follow-up (CU-13); Postulante — CV profiles (CU-16); both — analytics (CU-10, 11), recruiter contact (CU-12), account | The user chose "only as the PDF says" |
| 14 | Does the web show only what is allowed? | Yes: menu sections and action buttons filtered by `permisos`, through a static route → `codigoAccion` map; the server still enforces | RF_Core_14 step 6 |
| 15 | Is the alignment rule an ADR? | Yes: precedence project-wide, literal names in security and identity | Passes the three-part test (ADR-0023) |
| 16 | How is the Recruiter side of the pipeline handled? | Separate `/grill` and epic. This work grants the Recruiter its CU actions; the Postulante keeps its current grants until that epic removes them | The app never loses its pipeline and the end state is the same |
| 17 | How far do literal names reach? | Every class and attribute 19.13 draws: `User` → `Usuario` (in `apps/api`, `@repo/models` and `apps/web`), `displayName` → `nombreCompleto` (column, API, web), `UserRepository` → `ListaUsuarios`, `agregarHijo` → `agregar` plus `remover`. Tables keep the snake_case plural convention with spec names (`usuarios`, `sesiones`, `componentes`, `formularios`, `modulos`); use cases and controllers keep the `apps/api` architecture | `AuthService` and `PermisoService` are sequence-diagram participants, not 19.13 classes |
| 18 | What does the Factory do once the matrix is persisted? | One factory per role (Postulante, Recruiter, Administrador) defines the role's default tree: it seeds the shared groups when missing and hands a newly registered Persona its root. Runtime trees are loaded from the database | Keeps the project's mandatory Factory pattern with a real job; the PDF draws no factory, so this is no contradiction |
| 19 | Is there an Administrador? | Yes: a third Persona subtype, created only by the seed. It manages the matrix (CU-15) and the users. `/users`: `POST` removed, the `GET`s only for the Administrador | 18.10 and CU-15's actor |
| 20 | What does a Sesion store, and how does it end? | `tokenJWT` holds the JWT's SHA-256, never the token; `POST /auth/logout` sets `fechaExpiracion` to now; no row is deleted | A database leak exposes no live session |
| 21 | What are Modulo and Formulario used for? | Grouping the matrix in `GET /security/matrix` and the Administrador's screen; `MeResponse` keeps its shape | Formulario has no route in the PDF, so it cannot drive the web menu |
| 22 | When are permissions resolved? | When the Sesion starts; its ContextoSeguridad lives with it; a grant change applies from the next login | RF_Core_15 and CU-15 |
| 23 | Does Usuario keep a `role` column? | No: `usuarios.role` is dropped and `obtenerRol()` returns the Persona's `tipo` | 19.13 and 20.1 give Usuario no role; 19.2 calls `obtenerRol()` |
| 24 | What can the Administrador do with the matrix? | Create, edit and delete GrupoPermisos built from existing Acciones; assign or remove a Persona's roots, never its last; a web screen for it. Acciones, Formularios and Modulos are seed data | An Accion is bound to an endpoint in code, so a runtime-created one would guard nothing |
| 25 | How is the Accion catalog built? | One Accion per protected endpoint (all but register, login and health), grouped by the Formulario of its screen and the Modulo of its section, traced to its CU; `board.*` and `candidate.*` are removed | No endpoint and no CU backs those codes |
| 26 | Where does "only mine" live? | In the use cases, never in the matrix | The Composite cannot express ownership, and the code already scopes data by owner |
| 27 | Derived: is the permission join keyed by Usuario or Persona? | Persona | 19.13 and 19.14 govern over 20.1's `UsuarioComponente` (decision 3) |
| 28 | Derived: is `ListaUsuarios` a table? | No, it is a «Catálogo»; `intentosFallidos` is kept although 20.1 omits it | 19.13 stereotypes it as a catalog and draws `intentosFallidos` |
| 29 | Derived: what does the Postulante keep until the Recruiter epic? | All of its current grants — pipeline, dashboard and follow-up | Reading of decision 16 |
| 30 | Derived: are API payload fields renamed? | Not unless 19.13 draws them (e.g. `AuthResponse.user` keeps its name); only their types change | Decision 17 reaches 19.13's classes and attributes |
| 31 | Derived: how is the first Administrador created? | By the seed, from environment variables, with no default password | Decision 19 forbids registering one |
| 32 | Derived: what happens to existing data on deploy? | Every existing Persona gets its role's root, and every user logs in again | Invariant 12, and no Sesion exists yet |

## Errata for the Document

Recorded for v8.0's next version (decision 4). The code follows the governing figure instead.

**Fig. 18.9 (§18.2)**
- The Composite is `Componente`/`Grupo` with `tieneAcceso(u: Usuario, accion: String)`; 19.13 has
  `ComponentePermiso`/`GrupoPermisos` with `evaluar`.
- `Accion` carries `formulario` but no `codigoAccion`, which is what identifies it in 19.13.
- `Grupo` has `estado`, two lists (`acciones`, `grupos`), and `agregarComponente`/`eliminarComponente`;
  19.13 has one `hijos` list with `agregar`/`remover`.
- `contiene` is a composition; 19.13 draws an aggregation, and nodes are shared.
- `Usuario` has `id: int` beside `userId: String`, plus `username`, `usePerfil: Componente` and
  `login()`; 19.13 has `id: UUID`, `nombreCompleto`, `authProvider`, `intentosFallidos`,
  `autenticar()` and `incrementarIntentos()`.
- `Usuario 1 — evalua permisos en — 1 Componente` gives each Usuario one root; 19.13 gives each
  Persona one or more.
- `Sesion` has `id`, `token`, `fechaInicio`, `validarSesion()`; 20.1 and 17.5 have `tokenJWT`,
  `fechaEmision`, `fechaExpiracion`.
- `ListaUsuarios.buscarUsuario(email)` is `buscarPorEmail(email)` in 19.13.
- `Formulario 1 — pertenece a — 1 Modulo`; 20.1 gives a Modulo many Formularios.

**Fig. 19.13 (§19.2)**
- `Persona 1 — asociado a — 1..* ComponentePermiso`: the Persona end should be `*`, since groups are
  shared among Personas.
- `Persona.resolverPermisos()` returns one `ComponentePermiso` although a Persona holds 1..* roots.
- `evaluar()` omits the `codigoAccion` parameter it needs to answer anything.
- `Usuario.pertenece()`, `tiene()` and `evaluaPermisos()` are association names drawn as `void`
  methods.
- Formulario, Modulo, Sesion, ContextoSeguridad and Administrador are missing.

**Fig. 20.1 (§20.2)**
- `UsuarioComponente(usuarioId, componenteId)` keys permissions by Usuario; 19.13 and 19.14 hold
  them by Persona.
- A `ListaUsuarios` table and `Usuario.listaUsuariosId` persist a «Catálogo», which is not an entity.
- `Usuario` lacks `intentosFallidos`.
- Column types are SQL Server's (`uniqueidentifier`, `nvarchar`, `datetime2`); the implemented
  model runs on PostgreSQL.

**Fig. 18.10 (§18.2)**
- `Administrador` is drawn standalone; it is a third Persona subtype.

**Fig. 19.1 (§19.1.1)**
- `AuthService` asks a single `Usuario` for `buscarPorEmail(email)`; the query belongs to the
  `ListaUsuarios` catalog — the Parcial 2 review's "query the set, not the object".
- `new Sesion(tokenJWT)`: the Sesion stores the token's SHA-256, not the token.

**Fig. 19.2 (§19.1.1)**
- `new ComponentePermiso(rol)` instantiates an abstract class from the role. The tree is the
  Persona's roots loaded through `ComponentePermisoDAO.findArbolByPersona` (19.14), and the Sesion
  initializes the ContextoSeguridad (18.10), not `SecurityController.inicializarSesion`.

**Fig. 17.5 (§17.4.1)**
- The two abstract classes (Persona and ComponentePermiso) carry no name.
- `Persona 1 — asociado a — 1..*` has the same multiplicity problem as 19.13.

## Explicitly Out of Scope

- OAuth federated login (RF14, GitHub/Google); `authProvider` stays `native`.
- Persona subtype attributes (`perRUT`, `perTelefono`, `linkedin`, `mail`,
  `perfilSalidaActivoId`), and whether the Recruiter contact becomes a registered Recruiter.
- `EstadisticaUsuario`.
- The evaluations module (iteration D, RF21–RF25). The matrix only has to host its permissions,
  with "only the evaluations assigned to you" enforced by a use case (invariant 15).
- The Recruiter side of the pipeline: linking a RamaAplicacion to a registered Recruiter, a
  Recruiter's assigned branches and dashboard, and removing the Postulante's interim pipeline
  grants. It gets its own `/grill` and epic.
- Account lockout on `intentosFallidos`; the spec only counts attempts.
- Literal renames outside security and identity (`Application` → `RamaAplicacion`,
  `CvVersion` → `VersionPerfil`, …); ADR-0023 confines literal names to this scope.
- Renaming use cases and controllers after the sequence diagrams' services (`AuthService`,
  `PermisoService`) or the adapters after 19.14's DAOs.
- Creating Acciones, Formularios or Modulos at runtime; they are seed data.
- Instance-level permissions inside the Composite.
- Editing the PDF; this spec only lists errata.

## Glossary Changes

- `.agents/ubiquitous-language.md` — domain source re-pointed to v8.0 and its section numbers, and
  the naming convention now states the security and identity exception (ADR-0023). Identity and
  access: **User** renamed **Usuario** (stores no role; `autenticar`, `incrementarIntentos`),
  **Persona** has three subtypes, new **Administrador**, **Sesion** and **ListaUsuarios**.
  Permission matrix area rewritten for a persisted, shared Composite: **ComponentePermiso**
  (`agregar`/`remover`, shared nodes), **GrupoPermisos** (`descripcion`, the only interior node),
  **Modulo** and **Formulario** (outside the tree), **Accion** (one per endpoint, fixed by the
  seed), **ContextoSeguridad** (initialized by the Sesion), **MatrizPermisosFactory** (seeds and
  hands out roots), **PermissionMatrix** (grouped by Modulo and Formulario). The Recruiter contact
  and `user.created` rows follow the rename; `PermisosJerarquia`/`PersonaPermisos` dropped.
- `.agents/ubiquitous-language-invariants.md` — reworded 1 (Usuario), 2 (role is the Persona's
  `tipo`; `administrador` only by seed), 3 (`passwordHash` never leaves `apps/api`) and 10 (every
  non-public endpoint carries its own Accion); added 12 (security cardinalities), 13 (resolved when
  a Sesion starts), 14 (token hash; ends by expiry) and 15 (ownership belongs to the use case).
- `.agents/ubiquitous-language-changelog.md` — four rows dated 2026-10-12, one per round.
- `.agents/ubiquitous-language-index.md` — regenerated.

## ADRs Raised

- `.agents/adr/0023-code-follows-the-spec-class-diagram-first.md` — The code follows the spec, class
  diagram first.

## Residual Unknowns

- The exact Accion catalog — each endpoint's code, Formulario, Modulo and CU — is detailed by the
  plan; the round-4 example is indicative only.
- How `Persona.resolverPermisos()` exposes several roots (a list, or a transient group the
  ContextoSeguridad wraps), since 19.13 returns a single `ComponentePermiso`.
- Whether the per-request Sesion check hits the database every time or a short-lived cache.
- Whether `CreateUserUseCase` survives the removal of `POST /users`; `RegisterUseCase` already
  emits `user.created`, and the implementing slice updates that glossary row.
- `docs/DOCUMENTACION.md` §3–§5 describe the superseded per-role, in-memory design; the breakdown
  needs a documentation slice.
- The GitHub MCP server failed to connect during this session, and `/spec-breakdown` needs it.
