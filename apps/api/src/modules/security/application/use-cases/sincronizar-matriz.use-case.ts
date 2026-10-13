import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { ACCIONES, FORMULARIOS, MODULOS } from "../../domain/catalogo-matriz";
import { COMPONENTE_PERMISO_REPOSITORY, type ComponentePermisoRepository } from "../../domain/componente-permiso.repository";
import { MATRIZ_PERMISOS_FACTORIES, type MatrizPermisosFactories } from "../factories/matriz-permisos.factory";

/**
 * Boot / seed sync: writes the seed catalog, then hands every Persona found without roots its role's default roots.
 * A Persona is created holding its roots in one transaction, so that second step is a safety net — for rows
 * written before the matrix existed or by hand — not the way a new Persona normally gets them.
 */
@Injectable()
export class SincronizarMatrizUseCase {
  constructor(
    @Inject(COMPONENTE_PERMISO_REPOSITORY) private readonly componenteRepository: ComponentePermisoRepository,
    @Inject(MATRIZ_PERMISOS_FACTORIES) private readonly factories: MatrizPermisosFactories,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SincronizarMatrizUseCase.name);
  }

  async execute(): Promise<void> {
    this.logger.debug("Syncing the permission matrix catalog");

    // Parents before children: the Acciones point at their Formulario and default group.
    await this.componenteRepository.sincronizarModulosYFormularios(MODULOS, FORMULARIOS);

    for (const factory of Object.values(this.factories)) {
      await factory.sembrar();
    }

    await this.componenteRepository.sincronizarAcciones(ACCIONES);

    const personasSinRaices = await this.componenteRepository.listarPersonasSinRaices();

    for (const { personaId, tipo } of personasSinRaices) {
      await this.factories[tipo].otorgarRaices(personaId);
    }

    this.logger.log(
      `Permission matrix synced: ${MODULOS.length} modulos, ${FORMULARIOS.length} formularios, ${ACCIONES.length} acciones, ${personasSinRaices.length} personas handed their default roots`,
    );
  }
}
