import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { COMPONENTE_PERMISO_REPOSITORY, type ComponentePermisoRepository } from "../../domain/componente-permiso.repository";
import { GrupoEnUsoComoRaizError } from "../../domain/errors/matriz-permisos.errors";
import { exigirGrupo } from "../exigir-componentes";

/**
 * CU-15: deletes a GrupoPermisos and re-parents its children to the group's own parent. Refused while any Persona holds
 * the group as a root, so no Persona ends with no root (invariant 12) or loses permissions silently.
 */
@Injectable()
export class EliminarGrupoUseCase {
  constructor(
    @Inject(COMPONENTE_PERMISO_REPOSITORY) private readonly componenteRepository: ComponentePermisoRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(EliminarGrupoUseCase.name);
  }

  async execute(id: string): Promise<void> {
    await exigirGrupo(this.componenteRepository, id);

    const personasConRaiz = await this.componenteRepository.contarPersonasConRaiz(id);

    if (personasConRaiz > 0) {
      throw new GrupoEnUsoComoRaizError(id, personasConRaiz);
    }

    await this.componenteRepository.eliminarGrupo(id);

    this.logger.log(`Permission group ${id} deleted`);
  }
}
