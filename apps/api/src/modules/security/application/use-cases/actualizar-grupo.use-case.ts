import { Inject, Injectable } from "@nestjs/common";
import type { GrupoPermisos as GrupoPermisosModel, UpdateGrupoPermisosInput } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { COMPONENTE_PERMISO_REPOSITORY, type ComponentePermisoRepository } from "../../domain/componente-permiso.repository";
import { CicloEnMatrizError, ComponenteNoEncontradoError } from "../../domain/errors/matriz-permisos.errors";
import { exigirComponente, exigirGrupo, primeroProhibido } from "../exigir-componentes";

/**
 * CU-15: edits a GrupoPermisos — its name, description, parent and children. A child given moves out of the group that
 * held it (invariant 12) and a child left out is orphaned. Takes effect from each Persona's next login (invariant 13).
 */
@Injectable()
export class ActualizarGrupoUseCase {
  constructor(
    @Inject(COMPONENTE_PERMISO_REPOSITORY) private readonly componenteRepository: ComponentePermisoRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ActualizarGrupoUseCase.name);
  }

  async execute(id: string, input: UpdateGrupoPermisosInput): Promise<GrupoPermisosModel> {
    const grupoActual = await exigirGrupo(this.componenteRepository, id);
    const padreFinal = input.padreId === undefined ? grupoActual.padreId : input.padreId;

    if (input.padreId) {
      await exigirGrupo(this.componenteRepository, input.padreId);

      // The group cannot move into itself or into one of its descendants.
      if (input.padreId === id || (await this.componenteRepository.ancestros(input.padreId)).includes(id)) {
        throw new CicloEnMatrizError(id);
      }
    }

    const hijoIds = input.hijoIds === undefined ? undefined : [...new Set(input.hijoIds)];

    if (hijoIds) {
      for (const hijoId of hijoIds) {
        await exigirComponente(this.componenteRepository, hijoId);
      }

      // The group's own ancestors, as they stand once this edit lands, cannot sit inside it.
      const ancestros = padreFinal === null ? [] : [padreFinal, ...(await this.componenteRepository.ancestros(padreFinal))];
      const ciclo = primeroProhibido(hijoIds, new Set([id, ...ancestros]));

      if (ciclo !== undefined) {
        throw new CicloEnMatrizError(ciclo);
      }
    }

    await this.componenteRepository.actualizarGrupo(id, { nombre: input.nombre, descripcion: input.descripcion, padreId: input.padreId });

    if (hijoIds) {
      await this.componenteRepository.reemplazarHijos(id, hijoIds);
    }

    this.logger.log(`Permission group ${id} updated${hijoIds ? ` with ${hijoIds.length} children` : ""}`);

    const grupo = (await this.componenteRepository.listarGrupos()).find((candidato) => candidato.id === id);

    if (!grupo) {
      throw new ComponenteNoEncontradoError(id);
    }

    return grupo;
  }
}
