import { ComponentePermiso } from "./componente-permiso";

export class GrupoPermisos extends ComponentePermiso {
  private readonly hijos: ComponentePermiso[] = [];

  evaluar(codigoAccion: string): boolean {
    return this.hijos.some((hijo) => hijo.evaluar(codigoAccion));
  }

  obtenerHijos(): ComponentePermiso[] {
    return this.hijos;
  }

  agregarHijo(hijo: ComponentePermiso): void {
    this.hijos.push(hijo);
  }
}
