# The code follows the spec, class diagram first

The project's source of truth is the academic deliverable's latest iteration (UAI *Trabajo de
Diploma*, Evaluación Parcial 1, document v8.0 of 2026-09-27), yet its figures contradict one
another — on security alone, the "updated domain diagram" 18.9 that the document calls its
reference model disagrees with the conceptual view 17.5, the methods view 18.10, the sequences
19.1–19.2, the class diagram 19.13, the data-access objects 19.14 and the data model 20.1. When code
is aligned with the spec, the class diagram 19.13 governs: it is the last refinement of the
document's ICONIX chain (domain → robustness → updated domain → sequences → classes). What 19.13
does not draw is taken from 20.1, 19.1–19.2 and 18.10; a figure that contradicts the governing one
is recorded as an erratum for the document's next version and never implemented. In the security
and identity scope the code also takes the spec's names literally (`ListaUsuarios`,
`nombreCompleto`, `agregar`/`remover`), overriding there the glossary's default of English
identifiers mapped to SPEC names.

## Considered Options

- **Fig. 18.9 as written.** The document's declared reference, but the outlier on nearly every
  security point (`Componente`/`Grupo`, `tieneAcceso(u, accion)`, an `id: int` beside a `userId`),
  and its content matches the v5.0 changes of 2026-07-07 while 19.13 already answers the review of
  2026-07-14 (catalog and repository stereotypes).
- **Whichever reading most figures share.** Rejected: following the latest iteration asks for its
  latest refinement, not a vote among its figures.
- **Keep the code's names and record SPEC names as aliases**, the convention for the rest of the
  domain. Rejected for security and identity, so the code there reads name for name against the
  class diagram.

## Consequences

Every alignment ships an errata list for the document beside its design spec, and where the
fill-in figures disagree with each other, that work's design spec settles it. Under this rule,
epic #18's `Formulario`/`Modulo` as Composite nodes and its stateless session are reversed.
