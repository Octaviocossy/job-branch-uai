# Plan: Epic — Align the backend domain model with the domain diagram

> Status: **draft**
> Created: 2026-07-13
> Issue: #18
> Integration branch: epic/18-domain-model-alignment

## Goal

Close the three structural divergences between the `apps/api` backend and the academic
**Diagrama de Dominio Técnico**, bringing the code to the diagram: restore the
`Accion → Formulario → Modulo` layer in the security Composite, introduce the
`Persona <|-- Recruiter/Postulante` actor hierarchy (composing `Usuario`), and add the
`VersionPerfil → Vacante` (`snapshotVacante`) reference. A final wave syncs all narrative
documentation with the implemented result. `Sesion` and the computed metrics
(`EstadisticaUsuario`/`RendimientoPerfil`) are deliberately left as-is.

## Children & Waves

| Wave | Issue | Branch | Title | Status |
|------|-------|--------|-------|--------|
| 1 | #19 | `19-foundation-domain-model-alignment` | Foundation — shared models, DB schema + migration, glossary | pending |
| 2 | #20 | `20-composite-formulario-modulo` | Security Composite — Formulario → Modulo nodes | pending |
| 2 | #21 | `21-persona-actor-hierarchy` | Persona / Recruiter / Postulante actor hierarchy | pending |
| 2 | #22 | `22-cv-version-snapshot-vacante` | VersionPerfil → Vacante snapshot reference | pending |
| 3 | #23 | `23-docs-domain-model-alignment` | Sync all narrative documentation with the aligned model | pending |

## Dependency Edges

```
20 -> 19
21 -> 19
22 -> 19
23 -> 20
23 -> 21
23 -> 22
```

## Decomposition rationale

Foundation-first (`.agents/rules/parallel-orchestration.md`). #19 owns every shared,
conflict-prone artifact so the three wave-2 slices only *add* files inside their own module
and the epic auto-merge never conflicts:

- `packages/models/src/index.ts` (models barrel)
- `apps/api/src/database/schema/index.ts` (Drizzle schema barrel)
- `apps/api/drizzle/meta/_journal.json` + the single combined `0002_*.sql` migration
- `.agents/ubiquitous-language.md` (glossary)

#20 (Composite) touches only `apps/api/src/modules/security/` and needs no model/DB change,
so its dependency on #19 is purely for glossary/documentation coherence. #21 (Persona) and
#22 (snapshotVacante) consume #19's schemas/tables and add behavior in their own modules.

#23 (docs) is a wave-3 slice depending on all three behavior slices: it is the **sole owner
of every narrative doc file** (`docs/DOCUMENTACION.md`, the READMEs, per-app `AGENTS.md`,
`docs/RUNBOOK.md`) and runs last so it documents the *implemented* code, not the plan. The
canonical glossary `.agents/ubiquitous-language.md` stays with #19 — #23 must not touch it.
Being alone in its wave, #23 never conflicts on the big shared `docs/DOCUMENTACION.md`.

## Next step

Run `/execute-epic 18` — it creates `epic/18-domain-model-alignment`, runs wave 1 (#19),
then wave 2 (#20, #21, #22) in parallel, then wave 3 (#23), auto-merging each child into the
epic branch, and opens one `epic → main` PR.
