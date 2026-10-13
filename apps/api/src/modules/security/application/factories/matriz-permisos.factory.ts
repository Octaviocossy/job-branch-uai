import type { PersonaTipo } from "@repo/models";
import { Accion } from "../../domain/accion";
import { ACCIONES, GRUPOS, type GrupoDefinicion } from "../../domain/catalogo-matriz";
import type { ComponentePermiso } from "../../domain/componente-permiso";
import type { ComponentePermisoRepository } from "../../domain/componente-permiso.repository";
import { GrupoPermisos } from "../../domain/grupo-permisos";

export const MATRIZ_PERMISOS_FACTORIES = Symbol("MATRIZ_PERMISOS_FACTORIES");

/** Abstract Factory, one per role: defines the role's default roots, seeds their shared groups and hands them to a Persona. */
export interface MatrizPermisosFactory {
  readonly tipo: PersonaTipo;
  /** The role's default roots: ids of shared default groups. */
  raicesPorDefecto(): readonly string[];
  /** In-memory build of the role's default trees (documents and tests the role's grants; never persisted from here). */
  crear(): ComponentePermiso[];
  /** Seeds this role's shared default groups (and their subgroups) when missing. */
  sembrar(): Promise<void>;
  /** Hands a Persona this role's default roots. */
  otorgarRaices(personaId: string): Promise<void>;
}

export type MatrizPermisosFactories = Record<PersonaTipo, MatrizPermisosFactory>;

const TODOS_LOS_GRUPOS: readonly GrupoDefinicion[] = Object.values(GRUPOS);

/** Plain classes, not `@Injectable`, so the seed script can build them too. */
abstract class MatrizPermisosFactoryBase implements MatrizPermisosFactory {
  abstract readonly tipo: PersonaTipo;

  constructor(private readonly repository: ComponentePermisoRepository) {}

  abstract raicesPorDefecto(): readonly string[];

  crear(): ComponentePermiso[] {
    return this.raicesPorDefecto().map((id) => this.construirGrupo(this.grupo(id)));
  }

  async sembrar(): Promise<void> {
    const grupos = this.raicesPorDefecto().flatMap((id) => this.conDescendientes(this.grupo(id)));

    await this.repository.asegurarGrupos(grupos);
  }

  async otorgarRaices(personaId: string): Promise<void> {
    await this.repository.asignarRaices(personaId, this.raicesPorDefecto());
  }

  private grupo(id: string): GrupoDefinicion {
    const grupo = TODOS_LOS_GRUPOS.find((candidato) => candidato.id === id);

    if (!grupo) {
      throw new Error(`Unknown default group ${id}`);
    }

    return grupo;
  }

  private conDescendientes(grupo: GrupoDefinicion): GrupoDefinicion[] {
    const hijos = TODOS_LOS_GRUPOS.filter((candidato) => candidato.padreId === grupo.id);

    return [grupo, ...hijos.flatMap((hijo) => this.conDescendientes(hijo))];
  }

  private construirGrupo(definicion: GrupoDefinicion): GrupoPermisos {
    const grupo = new GrupoPermisos(definicion.id, definicion.nombre, definicion.descripcion);

    for (const subgrupo of TODOS_LOS_GRUPOS.filter((candidato) => candidato.padreId === definicion.id)) {
      grupo.agregar(this.construirGrupo(subgrupo));
    }

    for (const accion of ACCIONES.filter((candidata) => candidata.grupoPorDefecto === definicion.id)) {
      grupo.agregar(new Accion(accion.codigoAccion, accion.nombre, accion.codigoAccion, accion.formularioId));
    }

    return grupo;
  }
}

export class PostulanteMatrizFactory extends MatrizPermisosFactoryBase {
  readonly tipo = "postulante";

  // PIPELINE and SEGUIMIENTO are interim grants: the Postulante keeps everything it can do today
  // until the separate Recruiter-side epic removes them (decisions 16 and 29).
  raicesPorDefecto(): readonly string[] {
    return [GRUPOS.CUENTA.id, GRUPOS.PERFILES.id, GRUPOS.ANALITICA.id, GRUPOS.PIPELINE.id, GRUPOS.SEGUIMIENTO.id];
  }
}

export class RecruiterMatrizFactory extends MatrizPermisosFactoryBase {
  readonly tipo = "recruiter";

  raicesPorDefecto(): readonly string[] {
    return [GRUPOS.CUENTA.id, GRUPOS.PIPELINE.id, GRUPOS.SEGUIMIENTO.id, GRUPOS.ANALITICA.id];
  }
}

export class AdministradorMatrizFactory extends MatrizPermisosFactoryBase {
  readonly tipo = "administrador";

  raicesPorDefecto(): readonly string[] {
    return [GRUPOS.CUENTA.id, GRUPOS.ADMIN_PERMISOS.id, GRUPOS.ADMIN_USUARIOS.id];
  }
}

export function crearFactories(repository: ComponentePermisoRepository): MatrizPermisosFactories {
  return {
    postulante: new PostulanteMatrizFactory(repository),
    recruiter: new RecruiterMatrizFactory(repository),
    administrador: new AdministradorMatrizFactory(repository),
  };
}
