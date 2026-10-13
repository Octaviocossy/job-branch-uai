import { Inject, Injectable } from "@nestjs/common";
import type { CreateGrupoPermisosInput, GrupoPermisos as GrupoPermisosModel } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { COMPONENTE_PERMISO_REPOSITORY, type ComponentePermisoRepository } from "../../domain/componente-permiso.repository";
import { CicloEnMatrizError, ComponenteNoEncontradoError } from "../../domain/errors/matriz-permisos.errors";
import { exigirComponente, exigirGrupo, primeroProhibido } from "../exigir-componentes";

/**
 * CU-15: creates a GrupoPermisos from existing components. A node has one parent (invariant 12), so each child moves
 * out of the group that held it. Takes effect from each Persona's next login (invariant 13).
 */
@Injectable()
export class CrearGrupoUseCase {
  constructor(
    @Inject(COMPONENTE_PERMISO_REPOSITORY) private readonly componenteRepository: ComponentePermisoRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(CrearGrupoUseCase.name);
  }

  async execute(input: CreateGrupoPermisosInput): Promise<GrupoPermisosModel> {
    const padreId = input.padreId ?? null;
    const hijoIds = [...new Set(input.hijoIds)];

    if (padreId !== null) {
      await exigirGrupo(this.componenteRepository, padreId);
    }

    for (const hijoId of hijoIds) {
      await exigirComponente(this.componenteRepository, hijoId);
    }

    // The new group would sit inside its parent, so that parent and its ancestors cannot also sit inside the group.
    if (padreId !== null) {
      const ciclo = primeroProhibido(hijoIds, new Set([padreId, ...(await this.componenteRepository.ancestros(padreId))]));

      if (ciclo !== undefined) {
        throw new CicloEnMatrizError(ciclo);
      }
    }

    const id = await this.componenteRepository.crearGrupo({ nombre: input.nombre, descripcion: input.descripcion ?? null, padreId });
    await this.componenteRepository.reemplazarHijos(id, hijoIds);

    this.logger.log(`Permission group ${id} created under ${padreId ?? "no parent"} with ${hijoIds.length} children`);

    const grupo = (await this.componenteRepository.listarGrupos()).find((candidato) => candidato.id === id);

    if (!grupo) {
      throw new ComponenteNoEncontradoError(id);
    }

    return grupo;
  }
}
