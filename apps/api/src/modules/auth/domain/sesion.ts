import type { ComponentePermiso } from "../../security/domain/componente-permiso";
import { ContextoSeguridad } from "../../security/domain/contexto-seguridad";

/**
 * SPEC Sesion (20.1 attributes; 18.10 `inicializarContextoSeguridad`). A Sesion ends by expiry, never by deletion
 * (invariant 14), and holds the hash of its token, never the token.
 */
export class Sesion {
  private contexto: ContextoSeguridad | null = null;

  constructor(
    public readonly id: string,
    public readonly usuarioId: string,
    public readonly tokenJWT: string,
    public readonly fechaEmision: Date,
    private expiracion: Date,
  ) {}

  get fechaExpiracion(): Date {
    return this.expiracion;
  }

  get contextoSeguridad(): ContextoSeguridad | null {
    return this.contexto;
  }

  estaVigente(ahora: Date = new Date()): boolean {
    return this.expiracion.getTime() > ahora.getTime();
  }

  /** Logout or forced end: the expiry moves to now and the row stays. It never extends a Sesion that already ended. */
  cerrar(ahora: Date = new Date()): void {
    if (this.estaVigente(ahora)) {
      this.expiracion = ahora;
    }
  }

  /**
   * SPEC 18.10: the Sesion initializes its ContextoSeguridad from the Persona's resolved permissions, once, when it
   * starts (invariant 13). A second call would re-resolve the permissions mid-Sesion, so it is refused.
   */
  inicializarContextoSeguridad(raiz: ComponentePermiso): ContextoSeguridad {
    if (this.contexto) {
      throw new Error(`ContextoSeguridad already initialized sesionId=${this.id}`);
    }

    this.contexto = new ContextoSeguridad(raiz);

    return this.contexto;
  }
}
