import { Inject, Injectable } from "@nestjs/common";
import type { CatalogoMatriz } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { COMPONENTE_PERMISO_REPOSITORY, type ComponentePermisoRepository } from "../../domain/componente-permiso.repository";
import { agruparAcciones } from "../agrupar-acciones";

/** CU-15: every Accion grouped by Modulo and Formulario, each with the group that currently holds it. */
@Injectable()
export class ObtenerCatalogoUseCase {
  constructor(
    @Inject(COMPONENTE_PERMISO_REPOSITORY) private readonly componenteRepository: ComponentePermisoRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ObtenerCatalogoUseCase.name);
  }

  async execute(): Promise<CatalogoMatriz> {
    this.logger.debug("Reading the permission catalog");

    const catalogo = await this.componenteRepository.listarCatalogo();

    return agruparAcciones(catalogo, ({ id, codigoAccion, nombre, padreId, padreNombre }) => ({
      id,
      codigoAccion,
      nombre,
      grupo: padreId !== null && padreNombre !== null ? { id: padreId, nombre: padreNombre } : null,
    }));
  }
}
