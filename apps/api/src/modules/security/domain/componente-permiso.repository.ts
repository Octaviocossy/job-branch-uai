import type { GrupoPermisos as GrupoPermisosModel, PersonaRaices, PersonaTipo } from "@repo/models";
import type { AccionDefinicion, GrupoDefinicion } from "./catalogo-matriz";
import type { ComponentePermiso } from "./componente-permiso";
import type { Formulario } from "./formulario";
import type { Modulo } from "./modulo";

export const COMPONENTE_PERMISO_REPOSITORY = Symbol("COMPONENTE_PERMISO_REPOSITORY");

export interface PersonaSinRaices {
  personaId: string;
  tipo: PersonaTipo;
}

export interface ModuloFila {
  id: string;
  nombre: string;
}

export interface FormularioFila {
  id: string;
  nombre: string;
  moduloId: string;
}

/** One Accion of the catalog with the group that currently holds it (`padreId`/`padreNombre` are `null` when parentless). */
export interface AccionFila {
  id: string;
  codigoAccion: string;
  nombre: string;
  formularioId: string;
  padreId: string | null;
  padreNombre: string | null;
}

export interface CatalogoFilas {
  modulos: ModuloFila[];
  formularios: FormularioFila[];
  acciones: AccionFila[];
}

export interface ComponenteFila {
  id: string;
  tipo: "grupo" | "accion";
  padreId: string | null;
}

export interface PersonaFila {
  id: string;
  tipo: PersonaTipo;
}

export interface GrupoCampos {
  nombre?: string;
  descripcion?: string | null;
  padreId?: string | null;
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

  /** Every Modulo, Formulario and Accion, the Accion with its current group. */
  listarCatalogo(): Promise<CatalogoFilas>;
  /** Every group with its direct children and the number of Personas holding it as a root. */
  listarGrupos(): Promise<GrupoPermisosModel[]>;
  buscarComponente(id: string): Promise<ComponenteFila | null>;
  /** The strict ancestors of a component, nearest first (`padre_id`, then its `padre_id`, up to the top). */
  ancestros(id: string): Promise<string[]>;
  /** Inserts a parentless-or-nested group with no children and returns its id. */
  crearGrupo(grupo: { nombre: string; descripcion: string | null; padreId: string | null }): Promise<string>;
  /** Updates the given fields only; an omitted field is untouched, `null` clears `descripcion`/`padreId`. */
  actualizarGrupo(id: string, campos: GrupoCampos): Promise<void>;
  /** Makes `hijoIds` exactly the children of the group, in one transaction: a node moves out of its previous group, and a child left out is orphaned. */
  reemplazarHijos(grupoId: string, hijoIds: readonly string[]): Promise<void>;
  /** In one transaction: re-parents the group's children to the group's own parent, then deletes the group. */
  eliminarGrupo(id: string): Promise<void>;
  contarPersonasConRaiz(componenteId: string): Promise<number>;
  /** Every Persona with its Usuario and the roots it holds, ordered by email. */
  listarPersonasConRaices(): Promise<PersonaRaices[]>;
  buscarPersona(personaId: string): Promise<PersonaFila | null>;
  raicesDePersona(personaId: string): Promise<string[]>;
  removerRaiz(personaId: string, componenteId: string): Promise<void>;
}
