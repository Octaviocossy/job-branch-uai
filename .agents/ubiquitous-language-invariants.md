# Ubiquitous Language — Invariants

> Every invariant **this project's product** commits to. A breach of one is a **hard violation**
> at the review gate. **Owned by the project** — the scaffold ships this file empty and never
> rewrites it. The harness's own invariants live in
> `.agents/ubiquitous-language-invariants-scaffold.md` (scaffold-owned, identifiers `S1`, `S2`, …);
> do not copy them here. Number product invariants plainly — `**1. …**`, `**2. …**` — and append,
> never renumber, so a citation stays stable and never collides with an `S` identifier.
>
> **Last updated:** 2026-10-12
> **Budget:** notes 600 · warn 24576 · fail 32768 (bytes)

---

## Invariants and relationships

- **1. Entity cardinalities.** `Empresa 1—0..* Vacante`; `Vacante 1—0..* Application`;
  `Usuario (Postulante) 1—0..* CvVersion`; `Usuario (Postulante) 1—0..* Application`;
  `CvVersion 1—0..* Application` (the version used at apply time); `Application 1—1..* Hito`
  (its `timeline`); `Hito 1—0..1 Feedback`; `Application 1—0..* Recordatorio`.
- **2. A Usuario's role — its Persona's `tipo` — never changes.** It is chosen at registration — `postulante` or
  `recruiter` (BR-3) — except `administrador`, which only the seed assigns; no registration may
  choose it.
- **3. `passwordHash` never leaves `apps/api`.** It is stored only in `usuarios.password_hash` and
  read only by the Usuario entity to `autenticar`; no `@repo/models` type carries it — not
  `Usuario`, not `MeResponse`.
- **4. A Postulante has at most one Output Profile.** Making a CvVersion the Output Profile
  demotes the current one (BR-5).
- **5. A CvVersion leaves `borrador` only with a file attached** (BR-9).
- **6. A CV file is at most 10 MB** (`archivoCv`, BR-6).
- **7. An `archivado` CvVersion backs no new Application,** but keeps its ROI history (BR-10).
- **8. Every Application status change is recorded as a Hito** in that Application's `timeline`.
- **9. A terminal Application takes no new Hito, and a Hito never archives.** `AddHitoUseCase`
  rejects a Hito on an Application in a `TERMINAL_STATUSES` status, and a Hito whose `status` is
  `Archivado` — archiving goes through `POST /branches/:id/archive`. Both raise
  `InvalidStatusTransitionError`, mapped to HTTP 400.
- **10. Permissions are checked per request** (BR-4). Every endpoint except registration, login
  and health carries its own Accion through `@RequiereAccion('<codigo>')` and `PermissionsGuard`,
  and is served only when the permission tree of the caller's Persona grants that code.
- **11. `apps/web` never re-declares a domain shape.** Its view-models are the `@repo/models`
  Zod-inferred types, re-exported through `apps/web/models/index.ts`.
- **12. Security cardinalities.** `Usuario 1—1 Persona`; `Usuario 1—0..* Sesion`;
  `Persona *—1..* ComponentePermiso` (the roots it holds — a Persona never holds none, RF_Core_14);
  `ComponentePermiso 0..1—0..* ComponentePermiso` (`contiene`: one parent at most);
  `Accion *—1 Formulario`; `Formulario *—1 Modulo`.
- **13. Permissions are resolved when a Sesion starts** (RF_Core_15, CU-15). Its
  ContextoSeguridad is built once from the Persona's roots and lives as long as the Sesion; a grant
  change applies from the next login.
- **14. A Sesion stores its token's SHA-256, never the token, and ends by expiry, never by
  deletion.** `tokenJWT` holds the hash; logout sets `fechaExpiracion` to the moment of logout.
- **15. The matrix decides which action; the use case decides on which data.** Ownership — a
  Postulante's own Applications and CvVersions, the evaluations assigned to a Postulante — is
  enforced by the use case, never encoded in the Composite.
