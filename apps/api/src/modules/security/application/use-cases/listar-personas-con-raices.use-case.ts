import { Inject, Injectable } from "@nestjs/common";
import type { PersonaRaices } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { COMPONENTE_PERMISO_REPOSITORY, type ComponentePermisoRepository } from "../../domain/componente-permiso.repository";

/** CU-15: every Persona with its Usuario and the roots it holds. */
@Injectable()
export class ListarPersonasConRaicesUseCase {
  constructor(
    @Inject(COMPONENTE_PERMISO_REPOSITORY) private readonly componenteRepository: ComponentePermisoRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ListarPersonasConRaicesUseCase.name);
  }

  execute(): Promise<PersonaRaices[]> {
    this.logger.debug("Listing the Personas with their roots");

    return this.componenteRepository.listarPersonasConRaices();
  }
}
