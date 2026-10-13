import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeTestDb, truncateAll } from "../../../../test/setup/db";
import { componentes, formularios, modulos, personaComponentes, personas } from "../../../database/schema/index";
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

  const gruposCatalogo: GrupoDefinicion[] = Object.values(GRUPOS);

  async function sincronizarCatalogo() {
    await repo.sincronizarModulosYFormularios(MODULOS, FORMULARIOS);
    await repo.asegurarGrupos(gruposCatalogo);
    await repo.sincronizarAcciones(ACCIONES);
  }

  // Inserted directly: `DrizzlePersonaRepository.create` always hands a Persona its roots, and these specs
  // need one that holds none yet — the state `asignarRaices` and `listarPersonasSinRaices` exist for.
  async function crearPostulante(email: string) {
    const usuario = await listaUsuarios.agregarUsuario({ email, nombreCompleto: email, passwordHash: null });
    const [persona] = await db.insert(personas).values({ usuarioId: usuario.id, tipo: "postulante", puestoCorporativo: null, habilidadesMaster: [] }).returning();

    if (!persona) {
      throw new Error("Failed to create the test Persona");
    }

    return persona;
  }

  async function contar(tabla: typeof componentes | typeof formularios | typeof modulos | typeof personaComponentes): Promise<number> {
    const [fila] = await db.select({ total: sql<number>`count(*)::int` }).from(tabla);

    return fila?.total ?? 0;
  }

  function codigos(nodo: ComponentePermiso): string[] {
    return nodo instanceof Accion ? [nodo.codigoAccion] : nodo.obtenerHijos().flatMap(codigos);
  }

  async function idDeAccion(codigoAccion: string): Promise<string> {
    const [fila] = await db.select().from(componentes).where(eq(componentes.codigoAccion, codigoAccion));

    if (!fila) {
      throw new Error(`${codigoAccion} was not seeded`);
    }

    return fila.id;
  }

  async function padreDe(id: string): Promise<string | null | undefined> {
    const [fila] = await db.select().from(componentes).where(eq(componentes.id, id));

    return fila?.padreId;
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

  it("listarCatalogo returns every Modulo, Formulario and Accion, each Accion with the group that holds it", async () => {
    await sincronizarCatalogo();
    await db.update(componentes).set({ padreId: null }).where(eq(componentes.codigoAccion, "auth.me"));

    const catalogo = await repo.listarCatalogo();

    expect(catalogo.modulos).toHaveLength(MODULOS.length);
    expect(catalogo.formularios).toHaveLength(FORMULARIOS.length);
    expect(catalogo.acciones).toHaveLength(ACCIONES.length);
    expect(catalogo.acciones.find((accion) => accion.codigoAccion === "branch.list")).toMatchObject({
      nombre: "Listar ramas",
      padreId: GRUPOS.PIPELINE_TABLERO.id,
      padreNombre: "Tablero",
    });
    expect(catalogo.acciones.find((accion) => accion.codigoAccion === "auth.me")).toMatchObject({ padreId: null, padreNombre: null });
    expect(catalogo.formularios.find((formulario) => formulario.nombre === "Tablero")?.moduloId).toBe(MODULOS.find((modulo) => modulo.nombre === "Pipeline")?.id);
  });

  it("listarGrupos returns the groups by name with their direct children and how many Personas hold them as a root", async () => {
    await sincronizarCatalogo();
    const primera = await crearPostulante("holder-1@example.com");
    const segunda = await crearPostulante("holder-2@example.com");
    await repo.asignarRaices(primera.id, [GRUPOS.PIPELINE.id, GRUPOS.CUENTA.id]);
    await repo.asignarRaices(segunda.id, [GRUPOS.PIPELINE.id]);

    const grupos = await repo.listarGrupos();

    expect(grupos).toHaveLength(Object.values(GRUPOS).length);
    expect(grupos.map((grupo) => grupo.nombre)).toEqual([...grupos.map((grupo) => grupo.nombre)].sort((a, b) => a.localeCompare(b, "es")));
    const pipeline = grupos.find((grupo) => grupo.id === GRUPOS.PIPELINE.id);
    expect(pipeline).toMatchObject({ padreId: null, personasConRaiz: 2 });
    expect(pipeline?.hijos.map((hijo) => hijo.nombre)).toEqual(["Archivar rama", "Clonar rama", "Crear rama", "Hitos y feedback", "Tablero"]);
    expect(pipeline?.hijos.every((hijo) => hijo.tipo === "grupo" && hijo.codigoAccion === null)).toBe(true);
    const tablero = grupos.find((grupo) => grupo.id === GRUPOS.PIPELINE_TABLERO.id);
    expect(tablero).toMatchObject({ padreId: GRUPOS.PIPELINE.id, personasConRaiz: 0 });
    expect(tablero?.hijos.map((hijo) => [hijo.tipo, hijo.codigoAccion])).toEqual([
      ["accion", "branch.list"],
      ["accion", "branch.view"],
    ]);
    expect(grupos.find((grupo) => grupo.id === GRUPOS.CUENTA.id)?.personasConRaiz).toBe(1);
  });

  it("listarGrupos does not list an Accion as a group", async () => {
    await sincronizarCatalogo();

    const grupos = await repo.listarGrupos();

    expect(grupos.some((grupo) => grupo.nombre === "Listar ramas")).toBe(false);
  });

  it("buscarComponente returns the tipo and parent of a component, and null for an unknown id", async () => {
    await sincronizarCatalogo();

    expect(await repo.buscarComponente(GRUPOS.PIPELINE_TABLERO.id)).toEqual({ id: GRUPOS.PIPELINE_TABLERO.id, tipo: "grupo", padreId: GRUPOS.PIPELINE.id });
    expect(await repo.buscarComponente(await idDeAccion("branch.list"))).toMatchObject({ tipo: "accion", padreId: GRUPOS.PIPELINE_TABLERO.id });
    expect(await repo.buscarComponente(randomUUID())).toBeNull();
  });

  it("ancestros returns the chain of parents, nearest first", async () => {
    await sincronizarCatalogo();

    expect(await repo.ancestros(await idDeAccion("branch.list"))).toEqual([GRUPOS.PIPELINE_TABLERO.id, GRUPOS.PIPELINE.id]);
    expect(await repo.ancestros(GRUPOS.PIPELINE_TABLERO.id)).toEqual([GRUPOS.PIPELINE.id]);
  });

  it("ancestros returns nothing for a top-level group or an unknown id", async () => {
    await sincronizarCatalogo();

    expect(await repo.ancestros(GRUPOS.PIPELINE.id)).toEqual([]);
    expect(await repo.ancestros(randomUUID())).toEqual([]);
  });

  it("ancestros stops on a cycle instead of walking it forever", async () => {
    await sincronizarCatalogo();
    await db.update(componentes).set({ padreId: GRUPOS.PIPELINE_TABLERO.id }).where(eq(componentes.id, GRUPOS.PIPELINE.id));

    expect(await repo.ancestros(GRUPOS.PIPELINE_TABLERO.id)).toEqual([GRUPOS.PIPELINE.id, GRUPOS.PIPELINE_TABLERO.id]);
  });

  it("crearGrupo inserts an empty group and returns its id", async () => {
    await sincronizarCatalogo();

    const id = await repo.crearGrupo({ nombre: "Nuevo", descripcion: "Texto", padreId: GRUPOS.PIPELINE.id });

    const [fila] = await db.select().from(componentes).where(eq(componentes.id, id));
    expect(fila).toMatchObject({ tipo: "grupo", nombre: "Nuevo", descripcion: "Texto", padreId: GRUPOS.PIPELINE.id, codigoAccion: null, formularioId: null });
  });

  it("crearGrupo can insert a parentless group with no description", async () => {
    await sincronizarCatalogo();

    const id = await repo.crearGrupo({ nombre: "Suelto", descripcion: null, padreId: null });

    expect(await padreDe(id)).toBeNull();
  });

  it("actualizarGrupo changes only the given fields", async () => {
    await sincronizarCatalogo();

    await repo.actualizarGrupo(GRUPOS.PIPELINE_TABLERO.id, { nombre: "Tablero editado" });

    const [fila] = await db.select().from(componentes).where(eq(componentes.id, GRUPOS.PIPELINE_TABLERO.id));
    expect(fila).toMatchObject({ nombre: "Tablero editado", descripcion: GRUPOS.PIPELINE_TABLERO.descripcion, padreId: GRUPOS.PIPELINE.id });
  });

  it("actualizarGrupo clears the description and the parent when given null", async () => {
    await sincronizarCatalogo();

    await repo.actualizarGrupo(GRUPOS.PIPELINE_TABLERO.id, { descripcion: null, padreId: null });

    const [fila] = await db.select().from(componentes).where(eq(componentes.id, GRUPOS.PIPELINE_TABLERO.id));
    expect(fila).toMatchObject({ descripcion: null, padreId: null });
  });

  it("actualizarGrupo moves a group under another one and ignores an empty change", async () => {
    await sincronizarCatalogo();

    await repo.actualizarGrupo(GRUPOS.PIPELINE_TABLERO.id, { padreId: GRUPOS.PERFILES.id });
    await repo.actualizarGrupo(GRUPOS.PIPELINE_TABLERO.id, {});

    expect(await padreDe(GRUPOS.PIPELINE_TABLERO.id)).toBe(GRUPOS.PERFILES.id);
  });

  it("reemplazarHijos moves a node out of its old group and into the new one", async () => {
    await sincronizarCatalogo();
    const listar = await idDeAccion("branch.list");
    const nuevo = await repo.crearGrupo({ nombre: "Nuevo", descripcion: null, padreId: null });

    await repo.reemplazarHijos(nuevo, [listar]);

    expect(await padreDe(listar)).toBe(nuevo);
    const tablero = (await repo.listarGrupos()).find((grupo) => grupo.id === GRUPOS.PIPELINE_TABLERO.id);
    expect(tablero?.hijos.map((hijo) => hijo.codigoAccion)).toEqual(["branch.view"]);
  });

  it("reemplazarHijos orphans the children it leaves out and keeps the ones it lists", async () => {
    await sincronizarCatalogo();
    const listar = await idDeAccion("branch.list");
    const ver = await idDeAccion("branch.view");

    await repo.reemplazarHijos(GRUPOS.PIPELINE_TABLERO.id, [ver]);

    expect(await padreDe(listar)).toBeNull();
    expect(await padreDe(ver)).toBe(GRUPOS.PIPELINE_TABLERO.id);
  });

  it("reemplazarHijos with an empty list orphans every child of the group", async () => {
    await sincronizarCatalogo();

    await repo.reemplazarHijos(GRUPOS.PIPELINE_TABLERO.id, []);

    expect((await repo.listarGrupos()).find((grupo) => grupo.id === GRUPOS.PIPELINE_TABLERO.id)?.hijos).toEqual([]);
    expect(await padreDe(await idDeAccion("branch.list"))).toBeNull();
  });

  it("eliminarGrupo re-parents the children to the group's own parent, then deletes it", async () => {
    await sincronizarCatalogo();
    const listar = await idDeAccion("branch.list");

    await repo.eliminarGrupo(GRUPOS.PIPELINE_TABLERO.id);

    expect(await repo.buscarComponente(GRUPOS.PIPELINE_TABLERO.id)).toBeNull();
    expect(await padreDe(listar)).toBe(GRUPOS.PIPELINE.id);
  });

  it("eliminarGrupo leaves the children of a top-level group parentless", async () => {
    await sincronizarCatalogo();

    await repo.eliminarGrupo(GRUPOS.PIPELINE.id);

    expect(await repo.buscarComponente(GRUPOS.PIPELINE.id)).toBeNull();
    expect(await padreDe(GRUPOS.PIPELINE_TABLERO.id)).toBeNull();
  });

  it("eliminarGrupo is a no-op for an unknown id", async () => {
    await sincronizarCatalogo();
    const antes = await contar(componentes);

    await repo.eliminarGrupo(randomUUID());

    expect(await contar(componentes)).toBe(antes);
  });

  it("contarPersonasConRaiz counts the Personas holding a component as a root", async () => {
    await sincronizarCatalogo();
    const primera = await crearPostulante("count-1@example.com");
    const segunda = await crearPostulante("count-2@example.com");
    await repo.asignarRaices(primera.id, [GRUPOS.CUENTA.id]);
    await repo.asignarRaices(segunda.id, [GRUPOS.CUENTA.id, GRUPOS.PERFILES.id]);

    expect(await repo.contarPersonasConRaiz(GRUPOS.CUENTA.id)).toBe(2);
    expect(await repo.contarPersonasConRaiz(GRUPOS.PERFILES.id)).toBe(1);
    expect(await repo.contarPersonasConRaiz(GRUPOS.ANALITICA.id)).toBe(0);
  });

  it("listarPersonasConRaices lists the Personas by email with their Usuario and their roots by name", async () => {
    await sincronizarCatalogo();
    const segunda = await crearPostulante("b-second@example.com");
    const primera = await crearPostulante("a-first@example.com");
    await repo.asignarRaices(segunda.id, [GRUPOS.PIPELINE.id]);
    await repo.asignarRaices(primera.id, [GRUPOS.PERFILES.id, GRUPOS.CUENTA.id]);

    const resultado = await repo.listarPersonasConRaices();

    expect(resultado.map((persona) => persona.usuario.email)).toEqual(["a-first@example.com", "b-second@example.com"]);
    expect(resultado[0]).toMatchObject({
      personaId: primera.id,
      tipo: "postulante",
      usuario: { email: "a-first@example.com", nombreCompleto: "a-first@example.com" },
      raices: [
        { id: GRUPOS.CUENTA.id, nombre: "Cuenta", tipo: "grupo" },
        { id: GRUPOS.PERFILES.id, nombre: "Perfiles CV", tipo: "grupo" },
      ],
    });
    expect(resultado[1]?.raices).toEqual([{ id: GRUPOS.PIPELINE.id, nombre: "Pipeline", tipo: "grupo" }]);
  });

  it("listarPersonasConRaices still lists a Persona that holds no root", async () => {
    await sincronizarCatalogo();
    const persona = await crearPostulante("bare@example.com");

    expect(await repo.listarPersonasConRaices()).toEqual([expect.objectContaining({ personaId: persona.id, raices: [] })]);
  });

  it("listarPersonasConRaices reports an Accion held directly as a root with the tipo accion", async () => {
    await sincronizarCatalogo();
    const persona = await crearPostulante("leaf-root@example.com");
    await repo.asignarRaices(persona.id, [await idDeAccion("cv.upload")]);

    const [resultado] = await repo.listarPersonasConRaices();

    expect(resultado?.raices).toEqual([expect.objectContaining({ tipo: "accion" })]);
  });

  it("buscarPersona returns the Persona's id and tipo, and null for an unknown id", async () => {
    await sincronizarCatalogo();
    const persona = await crearPostulante("lookup@example.com");

    expect(await repo.buscarPersona(persona.id)).toEqual({ id: persona.id, tipo: "postulante" });
    expect(await repo.buscarPersona(randomUUID())).toBeNull();
  });

  it("raicesDePersona returns the ids of the roots a Persona holds", async () => {
    await sincronizarCatalogo();
    const persona = await crearPostulante("held@example.com");
    await repo.asignarRaices(persona.id, [GRUPOS.CUENTA.id, GRUPOS.PERFILES.id]);

    expect((await repo.raicesDePersona(persona.id)).sort()).toEqual([GRUPOS.CUENTA.id, GRUPOS.PERFILES.id].sort());
    expect(await repo.raicesDePersona(randomUUID())).toEqual([]);
  });

  it("removerRaiz removes only that root of that Persona", async () => {
    await sincronizarCatalogo();
    const persona = await crearPostulante("drop@example.com");
    const otra = await crearPostulante("keep@example.com");
    await repo.asignarRaices(persona.id, [GRUPOS.CUENTA.id, GRUPOS.PERFILES.id]);
    await repo.asignarRaices(otra.id, [GRUPOS.CUENTA.id]);

    await repo.removerRaiz(persona.id, GRUPOS.CUENTA.id);

    expect(await repo.raicesDePersona(persona.id)).toEqual([GRUPOS.PERFILES.id]);
    expect(await repo.raicesDePersona(otra.id)).toEqual([GRUPOS.CUENTA.id]);
  });
});
