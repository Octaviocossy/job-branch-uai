/** Raised when a component id names no row of the permission matrix. */
export class ComponenteNoEncontradoError extends Error {
  constructor(public readonly componenteId: string) {
    super(`Permission component ${componenteId} not found`);
    this.name = "ComponenteNoEncontradoError";
  }
}

export class PersonaNoEncontradaError extends Error {
  constructor(public readonly personaId: string) {
    super(`Persona ${personaId} not found`);
    this.name = "PersonaNoEncontradaError";
  }
}

/** Raised when a root is removed from a Persona that does not hold it. */
export class RaizNoAsignadaError extends Error {
  constructor(personaId: string, componenteId: string) {
    super(`Persona ${personaId} does not hold ${componenteId} as a root`);
    this.name = "RaizNoAsignadaError";
  }
}

/** Raised when an Accion is used where only a GrupoPermisos can go (a parent, or the target of an edit or delete). */
export class NoEsGrupoError extends Error {
  constructor(public readonly componenteId: string) {
    super(`Permission component ${componenteId} is not a group`);
    this.name = "NoEsGrupoError";
  }
}

/** Raised when placing a component would make a group its own ancestor (a node has one parent, and the tree has no cycle). */
export class CicloEnMatrizError extends Error {
  constructor(public readonly componenteId: string) {
    super(`Placing ${componenteId} there would make a group contain itself`);
    this.name = "CicloEnMatrizError";
  }
}

/** Raised when the root to remove is the Persona's only one (invariant 12, RF_Core_14). */
export class UltimaRaizError extends Error {
  constructor(personaId: string) {
    super(`The only root of Persona ${personaId} cannot be removed`);
    this.name = "UltimaRaizError";
  }
}

/** Raised when a group to delete is still held as a root by at least one Persona. */
export class GrupoEnUsoComoRaizError extends Error {
  constructor(
    grupoId: string,
    public readonly personasConRaiz: number,
  ) {
    super(`Group ${grupoId} is held as a root by ${personasConRaiz} Persona(s)`);
    this.name = "GrupoEnUsoComoRaizError";
  }
}
