import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { SESION_REPOSITORY, type SesionRepository } from "../../domain/sesion.repository";
import { ContextosSesionStore } from "../contextos-sesion.store";

/** Logout: the Sesion's expiry moves to now. Nothing is deleted (invariant 14), and closing a closed Sesion is a no-op. */
@Injectable()
export class CerrarSesionUseCase {
  constructor(
    @Inject(SESION_REPOSITORY) private readonly sesiones: SesionRepository,
    private readonly contextos: ContextosSesionStore,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(CerrarSesionUseCase.name);
  }

  async execute(sesionId: string): Promise<void> {
    const sesion = await this.sesiones.buscarPorId(sesionId);

    if (sesion) {
      sesion.cerrar();
      await this.sesiones.guardar(sesion);
    }

    this.contextos.eliminar(sesionId);

    this.logger.log(`Sesion closed id=${sesionId}`);
  }
}
