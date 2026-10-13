import { Inject, Injectable } from "@nestjs/common";
import { eq, isNull, sql } from "drizzle-orm";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import { componentes, formularios, modulos, personaComponentes, personas } from "../../../database/schema/index";
import { Accion } from "../domain/accion";
import type { AccionDefinicion, FormularioDefinicion, GrupoDefinicion, ModuloDefinicion } from "../domain/catalogo-matriz";
import type { ComponentePermiso } from "../domain/componente-permiso";
import type { ComponentePermisoRepository, PersonaSinRaices } from "../domain/componente-permiso.repository";
import { GrupoPermisos } from "../domain/grupo-permisos";

type ComponenteRow = typeof componentes.$inferSelect;

@Injectable()
export class DrizzleComponentePermisoRepository implements ComponentePermisoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async sincronizarModulosYFormularios(definicionesModulos: readonly ModuloDefinicion[], definicionesFormularios: readonly FormularioDefinicion[]): Promise<void> {
    if (definicionesModulos.length > 0) {
      await this.db
        .insert(modulos)
        .values(definicionesModulos.map(({ id, nombre }) => ({ id, nombre })))
        .onConflictDoUpdate({ target: modulos.id, set: { nombre: sql`excluded.nombre` } });
    }

    if (definicionesFormularios.length > 0) {
      await this.db
        .insert(formularios)
        .values(definicionesFormularios.map(({ id, nombre, moduloId }) => ({ id, nombre, moduloId })))
        .onConflictDoUpdate({ target: formularios.id, set: { nombre: sql`excluded.nombre`, moduloId: sql`excluded.modulo_id` } });
    }
  }

  async asegurarGrupos(grupos: readonly GrupoDefinicion[]): Promise<void> {
    if (grupos.length === 0) {
      return;
    }

    await this.db
      .insert(componentes)
      .values(this.padresPrimero(grupos).map(({ id, nombre, descripcion, padreId }) => ({ id, tipo: "grupo" as const, nombre, descripcion, padreId })))
      .onConflictDoNothing({ target: componentes.id });
  }

  async sincronizarAcciones(acciones: readonly AccionDefinicion[]): Promise<void> {
    if (acciones.length === 0) {
      return;
    }

    // `padre_id` is never in the update set, so an Administrador's move of an Accion survives a restart.
    await this.db
      .insert(componentes)
      .values(
        acciones.map(({ codigoAccion, nombre, formularioId, grupoPorDefecto }) => ({ tipo: "accion" as const, nombre, codigoAccion, formularioId, padreId: grupoPorDefecto })),
      )
      .onConflictDoUpdate({
        target: componentes.codigoAccion,
        set: { nombre: sql`excluded.nombre`, formularioId: sql`excluded.formulario_id` },
      });
  }

  async findArbolByPersona(personaId: string): Promise<ComponentePermiso[]> {
    const raices = await this.db.select({ componenteId: personaComponentes.componenteId }).from(personaComponentes).where(eq(personaComponentes.personaId, personaId));

    if (raices.length === 0) {
      return [];
    }

    // The whole matrix is a few dozen rows, so one query beats walking the tree level by level.
    const filas = (await this.db.select().from(componentes)).sort(porNombre);
    const nodos = new Map<string, ComponentePermiso>(filas.map((fila) => [fila.id, this.toNodo(fila)]));

    for (const fila of filas) {
      const padre = fila.padreId ? nodos.get(fila.padreId) : undefined;
      const nodo = nodos.get(fila.id);

      if (padre && nodo) {
        padre.agregar(nodo);
      }
    }

    return raices
      .map(({ componenteId }) => nodos.get(componenteId))
      .filter((nodo): nodo is ComponentePermiso => nodo !== undefined)
      .sort(porNombre);
  }

  async asignarRaices(personaId: string, componenteIds: readonly string[]): Promise<void> {
    if (componenteIds.length === 0) {
      return;
    }

    await this.db
      .insert(personaComponentes)
      .values(componenteIds.map((componenteId) => ({ personaId, componenteId })))
      .onConflictDoNothing();
  }

  async listarPersonasSinRaices(): Promise<PersonaSinRaices[]> {
    return this.db
      .select({ personaId: personas.id, tipo: personas.tipo })
      .from(personas)
      .leftJoin(personaComponentes, eq(personaComponentes.personaId, personas.id))
      .where(isNull(personaComponentes.personaId));
  }

  /** Orders definitions so that a group comes after its parent; a parent outside the list is assumed to exist already. */
  private padresPrimero(grupos: readonly GrupoDefinicion[]): GrupoDefinicion[] {
    const porId = new Map(grupos.map((grupo) => [grupo.id, grupo]));
    const profundidad = (grupo: GrupoDefinicion): number => {
      const padre = grupo.padreId ? porId.get(grupo.padreId) : undefined;

      return padre ? 1 + profundidad(padre) : 0;
    };

    return [...grupos].sort((a, b) => profundidad(a) - profundidad(b));
  }

  private toNodo(fila: ComponenteRow): ComponentePermiso {
    if (fila.tipo === "accion" && fila.codigoAccion !== null && fila.formularioId !== null) {
      return new Accion(fila.id, fila.nombre, fila.codigoAccion, fila.formularioId);
    }

    return new GrupoPermisos(fila.id, fila.nombre, fila.descripcion);
  }
}

function porNombre(a: { nombre: string; id: string }, b: { nombre: string; id: string }): number {
  return a.nombre.localeCompare(b.nombre, "es") || a.id.localeCompare(b.id);
}
