/** A form of one Modulo where Acciones execute. Not a ComponentePermiso: it sits outside the tree and grants nothing (ADR-0023). */
export class Formulario {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly moduloId: string,
  ) {}
}
