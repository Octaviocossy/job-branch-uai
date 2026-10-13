import { Accion } from "./accion";
import type { ComponentePermiso } from "./componente-permiso";

export class ContextoSeguridad {
  private root: ComponentePermiso;

  constructor(root: ComponentePermiso) {
    this.root = root;
  }

  cargarMatriz(componente: ComponentePermiso): void {
    this.root = componente;
  }

  tienePermiso(codigoAccion: string): boolean {
    return this.root.evaluar(codigoAccion);
  }

  /** Every permitted `codigoAccion` once, even when a group is reachable through several roots. */
  listarAcciones(): string[] {
    return [...new Set(this.flatten(this.root))];
  }

  private flatten(componente: ComponentePermiso): string[] {
    if (componente instanceof Accion) {
      return [componente.codigoAccion];
    }

    return componente.obtenerHijos().flatMap((hijo) => this.flatten(hijo));
  }
}
