import { Injectable } from "@nestjs/common";
import type { ContextoSeguridad } from "../../security/domain/contexto-seguridad";

interface ContextoDeSesion {
  contexto: ContextoSeguridad;
  fechaExpiracion: Date;
}

/**
 * The ContextoSeguridad each live Sesion initialized when it started (invariant 13), by `sesionId`. In memory and
 * single-instance: a process that lost an entry (restart) cannot rebuild it without re-resolving permissions
 * mid-Sesion, so `ValidarSesionUseCase` ends that Sesion instead.
 */
@Injectable()
export class ContextosSesionStore {
  private readonly contextos = new Map<string, ContextoDeSesion>();

  guardar(sesionId: string, contexto: ContextoSeguridad, fechaExpiracion: Date): void {
    this.descartarVencidos();
    this.contextos.set(sesionId, { contexto, fechaExpiracion });
  }

  obtener(sesionId: string): ContextoSeguridad | undefined {
    return this.contextos.get(sesionId)?.contexto;
  }

  eliminar(sesionId: string): void {
    this.contextos.delete(sesionId);
  }

  /** A Sesion past its expiry is never validated again, so its context would only linger. */
  private descartarVencidos(): void {
    const ahora = Date.now();

    for (const [sesionId, { fechaExpiracion }] of this.contextos) {
      if (fechaExpiracion.getTime() <= ahora) {
        this.contextos.delete(sesionId);
      }
    }
  }
}
