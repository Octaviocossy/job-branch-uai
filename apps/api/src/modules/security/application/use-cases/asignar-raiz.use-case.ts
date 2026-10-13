import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { COMPONENTE_PERMISO_REPOSITORY, type ComponentePermisoRepository } from "../../domain/componente-permiso.repository";
import { PersonaNoEncontradaError } from "../../domain/errors/matriz-permisos.errors";
import { exigirComponente } from "../exigir-componentes";

/** CU-15: hands a Persona one more root. Idempotent. Touches no live Sesion — the grant applies from the Persona's next login (invariant 13). */
@Injectable()
export class AsignarRaizUseCase {
  constructor(
    @Inject(COMPONENTE_PERMISO_REPOSITORY) private readonly componenteRepository: ComponentePermisoRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AsignarRaizUseCase.name);
  }

  async execute(personaId: string, componenteId: string): Promise<void> {
    if (!(await this.componenteRepository.buscarPersona(personaId))) {
      throw new PersonaNoEncontradaError(personaId);
    }

    await exigirComponente(this.componenteRepository, componenteId);
    await this.componenteRepository.asignarRaices(personaId, [componenteId]);

    this.logger.log(`Root ${componenteId} assigned to Persona ${personaId}`);
  }
}
