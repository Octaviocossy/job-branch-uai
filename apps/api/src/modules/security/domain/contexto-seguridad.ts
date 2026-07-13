import { Accion } from "./accion";
import type { ComponentePermiso } from "./componente-permiso";

export class ContextoSeguridad {
  private root: ComponentePermiso;

  constructor(root: ComponentePermiso) {
    this.root = root;
  }

  cargarMatriz(root: ComponentePermiso): void {
    this.root = root;
  }

  tienePermiso(codigoAccion: string): boolean {
    return this.root.evaluar(codigoAccion);
  }

  listarAcciones(): string[] {
    return this.flatten(this.root);
  }

  private flatten(componente: ComponentePermiso): string[] {
    const hijos = componente.obtenerHijos();

    if (hijos.length === 0) {
      return componente instanceof Accion ? [componente.codigoAccion] : [];
    }

    return hijos.flatMap((hijo) => this.flatten(hijo));
  }
}
