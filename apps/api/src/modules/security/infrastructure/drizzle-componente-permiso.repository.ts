import { Inject, Injectable } from "@nestjs/common";
import type { ComponenteResumen, GrupoPermisos as GrupoPermisosModel, PersonaRaices } from "@repo/models";
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import { componentes, formularios, modulos, personaComponentes, personas, usuarios } from "../../../database/schema/index";
import { Accion } from "../domain/accion";
import type { AccionDefinicion, GrupoDefinicion } from "../domain/catalogo-matriz";
import type { ComponentePermiso } from "../domain/componente-permiso";
import type { CatalogoFilas, ComponenteFila, ComponentePermisoRepository, GrupoCampos, PersonaFila, PersonaSinRaices } from "../domain/componente-permiso.repository";
import type { Formulario } from "../domain/formulario";
import { GrupoPermisos } from "../domain/grupo-permisos";
import type { Modulo } from "../domain/modulo";

type ComponenteRow = typeof componentes.$inferSelect;

@Injectable()
export class DrizzleComponentePermisoRepository implements ComponentePermisoRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async sincronizarModulosYFormularios(definicionesModulos: readonly Modulo[], definicionesFormularios: readonly Formulario[]): Promise<void> {
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

  async listarCatalogo(): Promise<CatalogoFilas> {
    const padre = alias(componentes, "padre");
    const [filasModulos, filasFormularios, filasAcciones] = await Promise.all([
      this.db.select({ id: modulos.id, nombre: modulos.nombre }).from(modulos),
      this.db.select({ id: formularios.id, nombre: formularios.nombre, moduloId: formularios.moduloId }).from(formularios),
      this.db
        .select({
          id: componentes.id,
          codigoAccion: componentes.codigoAccion,
          nombre: componentes.nombre,
          formularioId: componentes.formularioId,
          padreId: componentes.padreId,
          padreNombre: padre.nombre,
        })
        .from(componentes)
        .leftJoin(padre, eq(padre.id, componentes.padreId))
        .where(eq(componentes.tipo, "accion")),
    ]);

    return {
      modulos: filasModulos,
      formularios: filasFormularios,
      // The table check guarantees an Accion row has both; the filter only narrows the types.
      acciones: filasAcciones.flatMap(({ codigoAccion, formularioId, ...fila }) =>
        codigoAccion !== null && formularioId !== null ? [{ ...fila, codigoAccion, formularioId }] : [],
      ),
    };
  }

  async listarGrupos(): Promise<GrupoPermisosModel[]> {
    const [filas, raices] = await Promise.all([
      this.db.select().from(componentes),
      this.db.select({ componenteId: personaComponentes.componenteId, total: sql<number>`count(*)::int` }).from(personaComponentes).groupBy(personaComponentes.componenteId),
    ]);
    const personasPorRaiz = new Map(raices.map(({ componenteId, total }) => [componenteId, total]));
    const hijosPorPadre = new Map<string, ComponenteResumen[]>();

    for (const fila of [...filas].sort(porNombre)) {
      if (fila.padreId) {
        hijosPorPadre.set(fila.padreId, [...(hijosPorPadre.get(fila.padreId) ?? []), { id: fila.id, tipo: fila.tipo, nombre: fila.nombre, codigoAccion: fila.codigoAccion }]);
      }
    }

    return filas
      .filter((fila) => fila.tipo === "grupo")
      .sort(porNombre)
      .map((fila) => ({
        id: fila.id,
        nombre: fila.nombre,
        descripcion: fila.descripcion,
        padreId: fila.padreId,
        hijos: hijosPorPadre.get(fila.id) ?? [],
        personasConRaiz: personasPorRaiz.get(fila.id) ?? 0,
      }));
  }

  async buscarComponente(id: string): Promise<ComponenteFila | null> {
    const [fila] = await this.db.select({ id: componentes.id, tipo: componentes.tipo, padreId: componentes.padreId }).from(componentes).where(eq(componentes.id, id));

    return fila ?? null;
  }

  async ancestros(id: string): Promise<string[]> {
    // The whole matrix is a few dozen rows, so walking it in memory beats a recursive query.
    const filas = await this.db.select({ id: componentes.id, padreId: componentes.padreId }).from(componentes);
    const padres = new Map(filas.map(({ id: filaId, padreId }) => [filaId, padreId]));
    const cadena: string[] = [];
    let actual = padres.get(id) ?? null;

    // `cadena.includes` stops a walk over a cycle that the use cases forbid but the table cannot rule out.
    while (actual !== null && !cadena.includes(actual)) {
      cadena.push(actual);
      actual = padres.get(actual) ?? null;
    }

    return cadena;
  }

  async crearGrupo({ nombre, descripcion, padreId }: { nombre: string; descripcion: string | null; padreId: string | null }): Promise<string> {
    const [fila] = await this.db.insert(componentes).values({ tipo: "grupo", nombre, descripcion, padreId }).returning({ id: componentes.id });

    if (!fila) {
      throw new Error("Failed to create the permission group");
    }

    return fila.id;
  }

  async actualizarGrupo(id: string, campos: GrupoCampos): Promise<void> {
    const cambios = {
      ...(campos.nombre !== undefined && { nombre: campos.nombre }),
      ...(campos.descripcion !== undefined && { descripcion: campos.descripcion }),
      ...(campos.padreId !== undefined && { padreId: campos.padreId }),
    };

    if (Object.keys(cambios).length === 0) {
      return;
    }

    await this.db.update(componentes).set(cambios).where(eq(componentes.id, id));
  }

  async reemplazarHijos(grupoId: string, hijoIds: readonly string[]): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(componentes)
        .set({ padreId: null })
        .where(and(eq(componentes.padreId, grupoId), hijoIds.length > 0 ? notInArray(componentes.id, [...hijoIds]) : undefined));

      if (hijoIds.length > 0) {
        await tx
          .update(componentes)
          .set({ padreId: grupoId })
          .where(inArray(componentes.id, [...hijoIds]));
      }
    });
  }

  async eliminarGrupo(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [grupo] = await tx.select({ padreId: componentes.padreId }).from(componentes).where(eq(componentes.id, id));

      if (!grupo) {
        return;
      }

      await tx.update(componentes).set({ padreId: grupo.padreId }).where(eq(componentes.padreId, id));
      await tx.delete(componentes).where(eq(componentes.id, id));
    });
  }

  async contarPersonasConRaiz(componenteId: string): Promise<number> {
    const [fila] = await this.db.select({ total: sql<number>`count(*)::int` }).from(personaComponentes).where(eq(personaComponentes.componenteId, componenteId));

    return fila?.total ?? 0;
  }

  async listarPersonasConRaices(): Promise<PersonaRaices[]> {
    const filas = await this.db
      .select({
        personaId: personas.id,
        tipo: personas.tipo,
        usuarioId: usuarios.id,
        email: usuarios.email,
        nombreCompleto: usuarios.nombreCompleto,
        raizId: componentes.id,
        raizNombre: componentes.nombre,
        raizTipo: componentes.tipo,
      })
      .from(personas)
      .innerJoin(usuarios, eq(usuarios.id, personas.usuarioId))
      .leftJoin(personaComponentes, eq(personaComponentes.personaId, personas.id))
      .leftJoin(componentes, eq(componentes.id, personaComponentes.componenteId))
      .orderBy(usuarios.email, componentes.nombre);

    // A Persona holds at least one root, but the join stays left so one that holds none is still listed.
    const porPersona = new Map<string, PersonaRaices>();

    for (const fila of filas) {
      const persona = porPersona.get(fila.personaId) ?? {
        personaId: fila.personaId,
        tipo: fila.tipo,
        usuario: { id: fila.usuarioId, email: fila.email, nombreCompleto: fila.nombreCompleto },
        raices: [],
      };

      if (fila.raizId !== null && fila.raizNombre !== null && fila.raizTipo !== null) {
        persona.raices.push({ id: fila.raizId, nombre: fila.raizNombre, tipo: fila.raizTipo });
      }

      porPersona.set(fila.personaId, persona);
    }

    return [...porPersona.values()];
  }

  async buscarPersona(personaId: string): Promise<PersonaFila | null> {
    const [fila] = await this.db.select({ id: personas.id, tipo: personas.tipo }).from(personas).where(eq(personas.id, personaId));

    return fila ?? null;
  }

  async raicesDePersona(personaId: string): Promise<string[]> {
    const filas = await this.db.select({ componenteId: personaComponentes.componenteId }).from(personaComponentes).where(eq(personaComponentes.personaId, personaId));

    return filas.map(({ componenteId }) => componenteId);
  }

  async removerRaiz(personaId: string, componenteId: string): Promise<void> {
    await this.db.delete(personaComponentes).where(and(eq(personaComponentes.personaId, personaId), eq(personaComponentes.componenteId, componenteId)));
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
