import type { PersonaTipo } from "@repo/models";
import type { AccionDefinicion, GrupoDefinicion } from "./catalogo-matriz";
import type { ComponentePermiso } from "./componente-permiso";
import type { Formulario } from "./formulario";
import type { Modulo } from "./modulo";

export const COMPONENTE_PERMISO_REPOSITORY = Symbol("COMPONENTE_PERMISO_REPOSITORY");

export interface PersonaSinRaices {
  personaId: string;
  tipo: PersonaTipo;
}

export interface ComponentePermisoRepository {
  /** Upserts Modulos and Formularios by fixed id (names refreshed). */
  sincronizarModulosYFormularios(modulos: readonly Modulo[], formularios: readonly Formulario[]): Promise<void>;
  /** Inserts the missing groups, parents first; never touches an existing group (an Administrador may have edited it). */
  asegurarGrupos(grupos: readonly GrupoDefinicion[]): Promise<void>;
  /** Inserts missing Acciones under their default group; refreshes `nombre`/`formularioId` of existing ones, never their parent. */
  sincronizarAcciones(acciones: readonly AccionDefinicion[]): Promise<void>;
  /** SPEC 19.14 `findArbolByPersona`: the roots a Persona holds, each with its whole subtree. */
  findArbolByPersona(personaId: string): Promise<ComponentePermiso[]>;
  /** Adds roots to a Persona; already-held roots are ignored. */
  asignarRaices(personaId: string, componenteIds: readonly string[]): Promise<void>;
  listarPersonasSinRaices(): Promise<PersonaSinRaices[]>;
}
