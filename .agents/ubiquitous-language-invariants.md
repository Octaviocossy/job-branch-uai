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
  `User (Postulante) 1—0..* CvVersion`; `User (Postulante) 1—0..* Application`;
  `CvVersion 1—0..* Application` (the version used at apply time); `Application 1—1..* Hito`
  (its `timeline`); `Hito 1—0..1 Feedback`; `Application 1—0..* Recordatorio`.
- **2. A User's role is fixed at registration.** `role` (`postulante` or `recruiter`) is chosen
  when registering and never changes afterwards (BR-3).
- **3. `passwordHash` never leaves persistence.** It is stored only in `users.password_hash`; no
  `@repo/models` type carries it — not `User`, not `MeResponse`.
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
- **10. Permissions are checked per request** (BR-4). An endpoint guarded by
  `@RequiereAccion('<codigo>')` and `PermissionsGuard` is served only when the caller's role tree
  grants that action code.
- **11. `apps/web` never re-declares a domain shape.** Its view-models are the `@repo/models`
  Zod-inferred types, re-exported through `apps/web/models/index.ts`.
