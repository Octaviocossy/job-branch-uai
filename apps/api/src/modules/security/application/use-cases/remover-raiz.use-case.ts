import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { COMPONENTE_PERMISO_REPOSITORY, type ComponentePermisoRepository } from "../../domain/componente-permiso.repository";
import { PersonaNoEncontradaError, RaizNoAsignadaError, UltimaRaizError } from "../../domain/errors/matriz-permisos.errors";

/** CU-15: takes a root from a Persona, never its last one (invariant 12, RF_Core_14). Touches no live Sesion — the change applies from the Persona's next login (invariant 13). */
@Injectable()
export class RemoverRaizUseCase {
  constructor(
    @Inject(COMPONENTE_PERMISO_REPOSITORY) private readonly componenteRepository: ComponentePermisoRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(RemoverRaizUseCase.name);
  }

  async execute(personaId: string, componenteId: string): Promise<void> {
    if (!(await this.componenteRepository.buscarPersona(personaId))) {
      throw new PersonaNoEncontradaError(personaId);
    }

    const raices = await this.componenteRepository.raicesDePersona(personaId);

    if (!raices.includes(componenteId)) {
      throw new RaizNoAsignadaError(personaId, componenteId);
    }

    if (raices.length === 1) {
      throw new UltimaRaizError(personaId);
    }

    await this.componenteRepository.removerRaiz(personaId, componenteId);

    this.logger.log(`Root ${componenteId} removed from Persona ${personaId}`);
  }
}
