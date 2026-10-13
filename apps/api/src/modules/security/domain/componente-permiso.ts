/** SPEC 19.13 Composite component. Nodes are shared: at most one parent (`contiene`), yet any number of Personas may hold a node as a root (invariant 12). */
export abstract class ComponentePermiso {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
  ) {}

  abstract evaluar(codigoAccion: string): boolean;

  abstract obtenerHijos(): ComponentePermiso[];

  agregar(_hijo: ComponentePermiso): void {
    throw new Error(`${this.nombre} no admite hijos`);
  }

  remover(_hijo: ComponentePermiso): void {
    throw new Error(`${this.nombre} no admite hijos`);
  }
}
