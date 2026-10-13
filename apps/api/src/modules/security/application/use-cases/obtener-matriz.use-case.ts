import { Inject, Injectable } from "@nestjs/common";
import type { PermissionMatrix, PersonaTipo } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { COMPONENTE_PERMISO_REPOSITORY, type ComponentePermisoRepository } from "../../domain/componente-permiso.repository";
import type { ContextoSeguridad } from "../../domain/contexto-seguridad";
import { agruparAcciones } from "../agrupar-acciones";

/** The caller's own permitted Acciones grouped by Modulo and Formulario (decision 21). */
@Injectable()
export class ObtenerMatrizUseCase {
  constructor(
    @Inject(COMPONENTE_PERMISO_REPOSITORY) private readonly componenteRepository: ComponentePermisoRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ObtenerMatrizUseCase.name);
  }

  async execute(role: PersonaTipo, contexto: ContextoSeguridad): Promise<PermissionMatrix> {
    this.logger.debug(`Reading the permission matrix of a ${role}`);

    const catalogo = await this.componenteRepository.listarCatalogo();
    const permitidas = { ...catalogo, acciones: catalogo.acciones.filter(({ codigoAccion }) => contexto.tienePermiso(codigoAccion)) };

    return {
      role,
      modulos: agruparAcciones(permitidas, ({ id, codigoAccion, nombre }) => ({ id, codigoAccion, nombre }), { omitirVacios: true }),
    };
  }
}
