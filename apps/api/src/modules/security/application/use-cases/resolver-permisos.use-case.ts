import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { PERSONA_REPOSITORY, type PersonaRepository } from "../../../persona/domain/persona.repository";
import type { ComponentePermiso } from "../../domain/componente-permiso";
import { COMPONENTE_PERMISO_REPOSITORY, type ComponentePermisoRepository } from "../../domain/componente-permiso.repository";
import { GrupoPermisos } from "../../domain/grupo-permisos";

/** SPEC `Persona.resolverPermisos()`: the permission tree of a Usuario's Persona, loaded from the database. */
@Injectable()
export class ResolverPermisosUseCase {
  constructor(
    @Inject(PERSONA_REPOSITORY) private readonly personaRepository: PersonaRepository,
    @Inject(COMPONENTE_PERMISO_REPOSITORY) private readonly componenteRepository: ComponentePermisoRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ResolverPermisosUseCase.name);
  }

  /**
   * Returns a transient, never-persisted GrupoPermisos over the Persona's roots, so 19.13's single-component
   * `resolverPermisos(): ComponentePermiso` and `cargarMatriz(componente)` stay literal while a Persona holds 1..* roots.
   * Without a Persona the group is empty, which denies everything.
   */
  async execute(usuarioId: string): Promise<ComponentePermiso> {
    this.logger.debug(`Resolving permission tree for usuarioId=${usuarioId}`);

    const persona = await this.personaRepository.findByUsuarioId(usuarioId);

    if (!persona) {
      this.logger.warn(`Usuario without Persona, every permission denied usuarioId=${usuarioId}`);

      return new GrupoPermisos(`usuario:${usuarioId}`, "Sin Persona");
    }

    const raices = await this.componenteRepository.findArbolByPersona(persona.id);
    const arbol = new GrupoPermisos(`persona:${persona.id}`, "Raíces de la Persona");

    for (const raiz of raices) {
      arbol.agregar(raiz);
    }

    return arbol;
  }
}
