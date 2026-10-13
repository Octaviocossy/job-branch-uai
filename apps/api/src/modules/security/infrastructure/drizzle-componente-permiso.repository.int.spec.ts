import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeTestDb, truncateAll } from "../../../../test/setup/db";
import { componentes, formularios, modulos, personaComponentes } from "../../../database/schema/index";
import { DrizzlePersonaRepository } from "../../persona/infrastructure/drizzle-persona.repository";
import { DrizzleListaUsuarios } from "../../users/infrastructure/drizzle-lista-usuarios.repository";
import { Accion } from "../domain/accion";
import { ACCIONES, FORMULARIOS, GRUPOS, type GrupoDefinicion, MODULOS } from "../domain/catalogo-matriz";
import type { ComponentePermiso } from "../domain/componente-permiso";
import { GrupoPermisos } from "../domain/grupo-permisos";
import { DrizzleComponentePermisoRepository } from "./drizzle-componente-permiso.repository";

describe("DrizzleComponentePermisoRepository", () => {
  const { pool, db } = makeTestDb();
  const repo = new DrizzleComponentePermisoRepository(db);
  const listaUsuarios = new DrizzleListaUsuarios(db);
  const personaRepo = new DrizzlePersonaRepository(db);

  const gruposCatalogo: GrupoDefinicion[] = Object.values(GRUPOS);

  async function sincronizarCatalogo() {
    await repo.sincronizarModulosYFormularios(MODULOS, FORMULARIOS);
    await repo.asegurarGrupos(gruposCatalogo);
    await repo.sincronizarAcciones(ACCIONES);
  }

  async function crearPostulante(email: string) {
    const usuario = await listaUsuarios.agregarUsuario({ email, nombreCompleto: email, passwordHash: null });
    const persona = await personaRepo.create({ tipo: "postulante", usuarioId: usuario.id, puestoCorporativo: null, habilidadesMaster: [] });

    return persona;
  }

  async function contar(tabla: typeof componentes | typeof formularios | typeof modulos | typeof personaComponentes): Promise<number> {
    const [fila] = await db.select({ total: sql<number>`count(*)::int` }).from(tabla);

    return fila?.total ?? 0;
  }

  function codigos(nodo: ComponentePermiso): string[] {
    return nodo instanceof Accion ? [nodo.codigoAccion] : nodo.obtenerHijos().flatMap(codigos);
  }

  beforeAll(async () => {
    await truncateAll(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
    await db.execute(sql`TRUNCATE "componentes", "formularios", "modulos" RESTART IDENTITY CASCADE`);
  });

  it("syncing the catalog twice is idempotent: same row counts", async () => {
    await sincronizarCatalogo();
    const primera = {
      modulos: await contar(modulos),
      formularios: await contar(formularios),
      componentes: await contar(componentes),
    };

    await sincronizarCatalogo();

    expect(primera).toEqual({ modulos: MODULOS.length, formularios: FORMULARIOS.length, componentes: gruposCatalogo.length + ACCIONES.length });
    expect(await contar(modulos)).toBe(primera.modulos);
    expect(await contar(formularios)).toBe(primera.formularios);
    expect(await contar(componentes)).toBe(primera.componentes);
  });

  it("refreshes the names of Modulos and Formularios from the catalog", async () => {
    await sincronizarCatalogo();
    const modulo = MODULOS[0];
    const formulario = FORMULARIOS[0];
    if (!modulo || !formulario) throw new Error("catalog is empty");
    await db.update(modulos).set({ nombre: "Renombrado" }).where(eq(modulos.id, modulo.id));
    await db.update(formularios).set({ nombre: "Renombrado" }).where(eq(formularios.id, formulario.id));

    await repo.sincronizarModulosYFormularios(MODULOS, FORMULARIOS);

    const [moduloFila] = await db.select().from(modulos).where(eq(modulos.id, modulo.id));
    const [formularioFila] = await db.select().from(formularios).where(eq(formularios.id, formulario.id));
    expect(moduloFila?.nombre).toBe(modulo.nombre);
    expect(formularioFila?.nombre).toBe(formulario.nombre);
  });

  it("inserts a subgroup even when the definitions list it before its parent", async () => {
    await repo.asegurarGrupos([GRUPOS.PIPELINE_CREAR, GRUPOS.PIPELINE]);

    const [hijo] = await db.select().from(componentes).where(eq(componentes.id, GRUPOS.PIPELINE_CREAR.id));
    expect(hijo?.padreId).toBe(GRUPOS.PIPELINE.id);
  });

  it("does not move an Accion back to its default group when its padre_id was changed", async () => {
    await sincronizarCatalogo();
    await db.update(componentes).set({ padreId: GRUPOS.ADMIN_PERMISOS.id }).where(eq(componentes.codigoAccion, "branch.create"));

    await sincronizarCatalogo();

    const [fila] = await db.select().from(componentes).where(eq(componentes.codigoAccion, "branch.create"));
    expect(fila?.padreId).toBe(GRUPOS.ADMIN_PERMISOS.id);
  });

  it("keeps an edited group's nombre across asegurarGrupos", async () => {
    await sincronizarCatalogo();
    await db.update(componentes).set({ nombre: "Pipeline editado" }).where(eq(componentes.id, GRUPOS.PIPELINE.id));

    await repo.asegurarGrupos(gruposCatalogo);

    const [fila] = await db.select().from(componentes).where(eq(componentes.id, GRUPOS.PIPELINE.id));
    expect(fila?.nombre).toBe("Pipeline editado");
  });

  it("refreshes an Accion's nombre and formularioId from the catalog", async () => {
    await sincronizarCatalogo();
    const accion = ACCIONES.find((definicion) => definicion.codigoAccion === "branch.create");
    const otroFormulario = FORMULARIOS.find((formulario) => formulario.id !== accion?.formularioId);
    if (!accion || !otroFormulario) throw new Error("catalog is incomplete");
    await db.update(componentes).set({ nombre: "Renombrada", formularioId: otroFormulario.id }).where(eq(componentes.codigoAccion, accion.codigoAccion));

    await sincronizarCatalogo();

    const [fila] = await db.select().from(componentes).where(eq(componentes.codigoAccion, accion.codigoAccion));
    expect(fila?.nombre).toBe(accion.nombre);
    expect(fila?.formularioId).toBe(accion.formularioId);
  });

  it("findArbolByPersona returns the held roots with their nested subtrees", async () => {
    await sincronizarCatalogo();
    const persona = await crearPostulante("nested@example.com");
    await repo.asignarRaices(persona.id, [GRUPOS.PIPELINE.id, GRUPOS.CUENTA.id]);

    const raices = await repo.findArbolByPersona(persona.id);

    expect(raices.map((raiz) => raiz.id)).toEqual([GRUPOS.CUENTA.id, GRUPOS.PIPELINE.id]);
    const [cuenta, pipeline] = raices;
    expect(cuenta).toBeInstanceOf(GrupoPermisos);
    expect(codigos(cuenta as ComponentePermiso).sort()).toEqual(["auth.logout", "auth.me", "security.viewMatrix"]);
    expect(pipeline?.obtenerHijos().map((hijo) => hijo.nombre)).toEqual(["Archivar rama", "Clonar rama", "Crear rama", "Hitos y feedback", "Tablero"]);
    expect(pipeline?.evaluar("branch.addFeedback")).toBe(true);
    expect(pipeline?.evaluar("cv.create")).toBe(false);
  });

  it("findArbolByPersona returns an Accion held directly as a root", async () => {
    await sincronizarCatalogo();
    const persona = await crearPostulante("leaf@example.com");
    const [fila] = await db.select().from(componentes).where(eq(componentes.codigoAccion, "cv.upload"));
    if (!fila) throw new Error("cv.upload was not seeded");
    await repo.asignarRaices(persona.id, [fila.id]);

    const raices = await repo.findArbolByPersona(persona.id);

    expect(raices).toHaveLength(1);
    expect(raices[0]).toBeInstanceOf(Accion);
    expect(raices[0]?.evaluar("cv.upload")).toBe(true);
  });

  it("findArbolByPersona returns nothing for a Persona that holds no roots", async () => {
    await sincronizarCatalogo();
    const persona = await crearPostulante("none@example.com");

    expect(await repo.findArbolByPersona(persona.id)).toEqual([]);
  });

  it("asignarRaices is idempotent and a no-op for an empty list", async () => {
    await sincronizarCatalogo();
    const persona = await crearPostulante("roots@example.com");

    await repo.asignarRaices(persona.id, []);
    await repo.asignarRaices(persona.id, [GRUPOS.CUENTA.id, GRUPOS.PERFILES.id]);
    await repo.asignarRaices(persona.id, [GRUPOS.CUENTA.id]);

    expect(await contar(personaComponentes)).toBe(2);
  });

  it("listarPersonasSinRaices lists only the Personas that hold no root", async () => {
    await sincronizarCatalogo();
    const sinRaices = await crearPostulante("without@example.com");
    const conRaices = await crearPostulante("with@example.com");
    await repo.asignarRaices(conRaices.id, [GRUPOS.CUENTA.id]);

    const resultado = await repo.listarPersonasSinRaices();

    expect(resultado).toEqual([{ personaId: sinRaices.id, tipo: "postulante" }]);
  });
});
