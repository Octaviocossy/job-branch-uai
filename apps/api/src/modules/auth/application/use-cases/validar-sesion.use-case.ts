import { Inject, Injectable } from "@nestjs/common";
import { hashToken } from "../../../../shared/auth/token-hash";
import { AppLogger } from "../../../../shared/logger/app.logger";
import type { ContextoSeguridad } from "../../../security/domain/contexto-seguridad";
import { SESION_REPOSITORY, type SesionRepository } from "../../domain/sesion.repository";
import { ContextosSesionStore } from "../contextos-sesion.store";

export interface SesionVigente {
  sesionId: string;
  contexto: ContextoSeguridad;
}

/** Every authenticated request needs a live Sesion: the token's hash must name one that has not expired. */
@Injectable()
export class ValidarSesionUseCase {
  constructor(
    @Inject(SESION_REPOSITORY) private readonly sesiones: SesionRepository,
    private readonly contextos: ContextosSesionStore,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ValidarSesionUseCase.name);
  }

  async execute(token: string): Promise<SesionVigente | null> {
    const sesion = await this.sesiones.buscarPorToken(hashToken(token));

    if (!sesion?.estaVigente()) {
      return null;
    }

    const contexto = this.contextos.obtener(sesion.id);

    if (!contexto) {
      // The process restarted, so the context resolved when the Sesion started is gone. Re-resolving it here would let a
      // grant change reach a Sesion before its next login (invariant 13): the Sesion ends instead.
      this.logger.warn(`Sesion has no ContextoSeguridad in this process, ending it id=${sesion.id}`);
      sesion.cerrar();
      await this.sesiones.guardar(sesion);

      return null;
    }

    return { sesionId: sesion.id, contexto };
  }
}
