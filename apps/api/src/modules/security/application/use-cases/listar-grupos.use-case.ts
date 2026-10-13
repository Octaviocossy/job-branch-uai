import { Inject, Injectable } from "@nestjs/common";
import type { GrupoPermisos as GrupoPermisosModel } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { COMPONENTE_PERMISO_REPOSITORY, type ComponentePermisoRepository } from "../../domain/componente-permiso.repository";

/** CU-15: every GrupoPermisos with its direct children and the number of Personas holding it as a root. */
@Injectable()
export class ListarGruposUseCase {
  constructor(
    @Inject(COMPONENTE_PERMISO_REPOSITORY) private readonly componenteRepository: ComponentePermisoRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ListarGruposUseCase.name);
  }

  execute(): Promise<GrupoPermisosModel[]> {
    this.logger.debug("Listing the permission groups");

    return this.componenteRepository.listarGrupos();
  }
}
