import { ComponentePermiso } from "./componente-permiso";

/** SPEC 19.13 leaf: one permitted action, identified by `codigoAccion` and executed in one Formulario. */
export class Accion extends ComponentePermiso {
  constructor(
    id: string,
    nombre: string,
    public readonly codigoAccion: string,
    public readonly formularioId: string,
  ) {
    super(id, nombre);
  }

  evaluar(codigoAccion: string): boolean {
    return codigoAccion === this.codigoAccion;
  }

  obtenerHijos(): ComponentePermiso[] {
    return [];
  }
}
