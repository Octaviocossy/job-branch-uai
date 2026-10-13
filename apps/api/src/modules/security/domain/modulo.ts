/** A module of the application that owns Formularios. Not a ComponentePermiso: it sits outside the tree and grants nothing (ADR-0023). */
export class Modulo {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
  ) {}
}
