import { randomUUID } from "node:crypto";
import type { INestApplication } from "@nestjs/common";
import type { CatalogoMatriz, GrupoPermisos, PermissionMatrix, PersonaRaices } from "@repo/models";
import { and, eq, notInArray } from "drizzle-orm";
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { componentes } from "../src/database/schema/index";
import { ACCIONES, GRUPOS } from "../src/modules/security/domain/catalogo-matriz";
import { createTestApp } from "./setup/app";
import { crearAdministrador, DEFAULT_PASSWORD, login, registrar } from "./setup/auth";
import { makeTestDb, type TestDatabase, truncateAll } from "./setup/db";

describe("Permission matrix administration (e2e)", () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication["getHttpServer"]>;
  let db: TestDatabase;
  let pool: ReturnType<typeof makeTestDb>["pool"];

  const ADMIN_EMAIL = "admin@example.com";

  // The matrix catalog is seed data that `truncateAll` leaves alone, so what these tests create, move or delete is put
  // back from the seed definitions — the same ones the boot sync writes — whatever state a failed run left behind.
  async function restaurarMatriz() {
    const grupos = Object.values(GRUPOS);

    await db.update(componentes).set({ padreId: null });
    await db.delete(componentes).where(
      and(
        eq(componentes.tipo, "grupo"),
        notInArray(
          componentes.id,
          grupos.map(({ id }) => id),
        ),
      ),
    );
    await db
      .insert(componentes)
      .values(grupos.map(({ id, nombre, descripcion }) => ({ id, tipo: "grupo" as const, nombre, descripcion })))
      .onConflictDoNothing();

    for (const { id, nombre, descripcion, padreId } of grupos) {
      await db.update(componentes).set({ nombre, descripcion, padreId }).where(eq(componentes.id, id));
    }

    for (const { codigoAccion, grupoPorDefecto } of ACCIONES) {
      await db.update(componentes).set({ padreId: grupoPorDefecto }).where(eq(componentes.codigoAccion, codigoAccion));
    }
  }

  beforeAll(async () => {
    ({ app, http } = await createTestApp());
    ({ db, pool } = makeTestDb());
    await restaurarMatriz();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  afterEach(async () => {
    await truncateAll(db);
    await restaurarMatriz();
  });

  const adminToken = async () => {
    await crearAdministrador(app, ADMIN_EMAIL, DEFAULT_PASSWORD);

    return login(http, ADMIN_EMAIL, DEFAULT_PASSWORD);
  };

  const con = (token: string) => ({ Authorization: `Bearer ${token}` });

  const catalogo = async (token: string): Promise<CatalogoMatriz> => (await request(http).get("/security/catalog").set(con(token))).body as CatalogoMatriz;

  const idDeAccion = async (token: string, codigoAccion: string): Promise<string> => {
    const accion = (await catalogo(token))
      .flatMap((modulo) => modulo.formularios.flatMap((formulario) => formulario.acciones))
      .find((candidata) => candidata.codigoAccion === codigoAccion);

    if (!accion) {
      throw new Error(`${codigoAccion} is not in the catalog`);
    }

    return accion.id;
  };

  const grupos = async (token: string): Promise<GrupoPermisos[]> => (await request(http).get("/security/groups").set(con(token))).body as GrupoPermisos[];

  const personas = async (token: string): Promise<PersonaRaices[]> => (await request(http).get("/security/personas").set(con(token))).body as PersonaRaices[];

  const personaDe = async (token: string, email: string): Promise<PersonaRaices> => {
    const persona = (await personas(token)).find((candidata) => candidata.usuario.email === email);

    if (!persona) {
      throw new Error(`No Persona for ${email}`);
    }

    return persona;
  };

  const crearGrupo = async (token: string, body: Record<string, unknown>): Promise<GrupoPermisos> => {
    const response = await request(http).post("/security/groups").set(con(token)).send(body);

    expect(response.status).toBe(201);

    return response.body as GrupoPermisos;
  };

  describe("access", () => {
    it("a postulante gets 403 on every admin endpoint", async () => {
      const { token } = await registrar(http, { role: "postulante" });
      const id = randomUUID();

      const respuestas = [
        await request(http).get("/security/catalog").set(con(token)),
        await request(http).get("/security/groups").set(con(token)),
        await request(http).post("/security/groups").set(con(token)).send({ nombre: "Nuevo" }),
        await request(http).patch(`/security/groups/${id}`).set(con(token)).send({}),
        await request(http).delete(`/security/groups/${id}`).set(con(token)),
        await request(http).get("/security/personas").set(con(token)),
        await request(http).post(`/security/personas/${id}/roots`).set(con(token)).send({ componenteId: id }),
        await request(http).delete(`/security/personas/${id}/roots/${id}`).set(con(token)),
      ];

      expect(respuestas.map((respuesta) => respuesta.status)).toEqual(Array(8).fill(403));
    });

    it("a request without a token is unauthorized", async () => {
      const response = await request(http).get("/security/groups");

      expect(response.status).toBe(401);
    });
  });

  describe("an Administrador", () => {
    it("reads the catalog: 29 Acciones in 6 Modulos, each with the group that holds it", async () => {
      const token = await adminToken();

      const response = await request(http).get("/security/catalog").set(con(token));
      const body = response.body as CatalogoMatriz;

      expect(response.status).toBe(200);
      expect(body).toHaveLength(6);
      const acciones = body.flatMap((modulo) => modulo.formularios.flatMap((formulario) => formulario.acciones));
      expect(acciones).toHaveLength(29);
      expect(acciones.find((accion) => accion.codigoAccion === "branch.list")?.grupo?.nombre).toBe("Tablero");
    });

    it("creates a group from existing Acciones, which leave the group that held them", async () => {
      const token = await adminToken();
      const listar = await idDeAccion(token, "branch.list");

      const creado = await crearGrupo(token, { nombre: "Solo listar", descripcion: "Una sola acción", hijoIds: [listar] });

      expect(creado).toMatchObject({ nombre: "Solo listar", descripcion: "Una sola acción", padreId: null, personasConRaiz: 0 });
      expect(creado.hijos).toEqual([expect.objectContaining({ id: listar, tipo: "accion", codigoAccion: "branch.list" })]);
      const tablero = (await grupos(token)).find((grupo) => grupo.nombre === "Tablero");
      expect(tablero?.hijos.map((hijo) => hijo.codigoAccion)).toEqual(["branch.view"]);
      const accion = (await catalogo(token)).flatMap((modulo) => modulo.formularios.flatMap((formulario) => formulario.acciones)).find((candidata) => candidata.id === listar);
      expect(accion?.grupo).toEqual({ id: creado.id, nombre: "Solo listar" });
    });

    it("edits a group: name, description, parent and children", async () => {
      const token = await adminToken();
      const listar = await idDeAccion(token, "branch.list");
      const creado = await crearGrupo(token, { nombre: "Solo listar", hijoIds: [listar] });
      const pipeline = (await grupos(token)).find((grupo) => grupo.nombre === "Pipeline");

      const response = await request(http).patch(`/security/groups/${creado.id}`).set(con(token)).send({ nombre: "Listado", descripcion: "Editado", padreId: pipeline?.id });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ id: creado.id, nombre: "Listado", descripcion: "Editado", padreId: pipeline?.id });
      expect((response.body as GrupoPermisos).hijos).toHaveLength(1);
    });

    it("keeps a group's children when an edit does not mention them, and empties it when hijoIds is empty", async () => {
      const token = await adminToken();
      const creado = await crearGrupo(token, { nombre: "Solo listar", hijoIds: [await idDeAccion(token, "branch.list")] });

      const renombrado = await request(http).patch(`/security/groups/${creado.id}`).set(con(token)).send({ nombre: "Renombrado" });
      const vaciado = await request(http).patch(`/security/groups/${creado.id}`).set(con(token)).send({ hijoIds: [] });

      expect((renombrado.body as GrupoPermisos).hijos).toHaveLength(1);
      expect((vaciado.body as GrupoPermisos).hijos).toEqual([]);
    });

    it("assigns a group to a postulante's Persona and lists it among that Persona's roots", async () => {
      const token = await adminToken();
      const email = "postulante@example.com";
      await registrar(http, { email, role: "postulante" });
      const creado = await crearGrupo(token, { nombre: "Solo listar", hijoIds: [await idDeAccion(token, "branch.list")] });
      const persona = await personaDe(token, email);

      const response = await request(http).post(`/security/personas/${persona.personaId}/roots`).set(con(token)).send({ componenteId: creado.id });

      expect(response.status).toBe(204);
      expect((await personaDe(token, email)).raices).toContainEqual({ id: creado.id, nombre: "Solo listar", tipo: "grupo" });
      expect((await grupos(token)).find((grupo) => grupo.id === creado.id)?.personasConRaiz).toBe(1);
    });

    it("lists every Persona with its Usuario and role, ordered by email", async () => {
      const token = await adminToken();
      await registrar(http, { email: "zeta@example.com", role: "recruiter" });
      await registrar(http, { email: "alfa@example.com", role: "postulante" });

      const lista = await personas(token);

      expect(lista.map((persona) => persona.usuario.email)).toEqual(["admin@example.com", "alfa@example.com", "zeta@example.com"]);
      expect(lista.map((persona) => persona.tipo)).toEqual(["administrador", "postulante", "recruiter"]);
      expect(lista.every((persona) => persona.raices.length > 0)).toBe(true);
    });

    it("removes roots from a Persona but gets 409 when it is the last one", async () => {
      const token = await adminToken();
      const email = "postulante@example.com";
      await registrar(http, { email, role: "postulante" });
      const { personaId, raices } = await personaDe(token, email);
      expect(raices.length).toBeGreaterThan(1);

      for (const raiz of raices.slice(1)) {
        const response = await request(http).delete(`/security/personas/${personaId}/roots/${raiz.id}`).set(con(token));

        expect(response.status).toBe(204);
      }

      const ultima = raices[0];
      const response = await request(http).delete(`/security/personas/${personaId}/roots/${ultima?.id}`).set(con(token));
      expect(response.status).toBe(409);
      expect((await personaDe(token, email)).raices).toEqual([ultima]);
    });

    it("gets 409 deleting a group a Persona holds as a root, and 204 once nobody holds it", async () => {
      const token = await adminToken();
      const email = "postulante@example.com";
      await registrar(http, { email, role: "postulante" });
      const creado = await crearGrupo(token, { nombre: "Solo listar", hijoIds: [await idDeAccion(token, "branch.list")] });
      const { personaId } = await personaDe(token, email);
      await request(http).post(`/security/personas/${personaId}/roots`).set(con(token)).send({ componenteId: creado.id });

      const retenido = await request(http).delete(`/security/groups/${creado.id}`).set(con(token));
      await request(http).delete(`/security/personas/${personaId}/roots/${creado.id}`).set(con(token));
      const libre = await request(http).delete(`/security/groups/${creado.id}`).set(con(token));

      expect(retenido.status).toBe(409);
      expect(libre.status).toBe(204);
      expect((await grupos(token)).some((grupo) => grupo.id === creado.id)).toBe(false);
    });

    it("deleting a group hands its children to the group's own parent", async () => {
      const token = await adminToken();
      const todos = await grupos(token);
      const tablero = todos.find((grupo) => grupo.nombre === "Tablero");
      const pipeline = todos.find((grupo) => grupo.nombre === "Pipeline");

      const response = await request(http).delete(`/security/groups/${tablero?.id}`).set(con(token));

      expect(response.status).toBe(204);
      const despues = (await grupos(token)).find((grupo) => grupo.id === pipeline?.id);
      expect(despues?.hijos.map((hijo) => hijo.codigoAccion)).toEqual(expect.arrayContaining(["branch.list", "branch.view"]));
    });
  });

  describe("errors", () => {
    it("rejects an invalid body with 400", async () => {
      const token = await adminToken();

      const sinNombre = await request(http).post("/security/groups").set(con(token)).send({ nombre: "" });
      const hijoInvalido = await request(http)
        .post("/security/groups")
        .set(con(token))
        .send({ nombre: "Nuevo", hijoIds: ["no-es-uuid"] });
      const raizInvalida = await request(http).post(`/security/personas/${randomUUID()}/roots`).set(con(token)).send({});

      expect([sinNombre.status, hijoInvalido.status, raizInvalida.status]).toEqual([400, 400, 400]);
    });

    it("rejects a path id that is not a uuid with 400", async () => {
      const token = await adminToken();

      const response = await request(http).delete("/security/groups/no-es-uuid").set(con(token));

      expect(response.status).toBe(400);
    });

    it("answers 404 for a group, a child, a Persona and a root that do not exist", async () => {
      const token = await adminToken();
      const email = "postulante@example.com";
      await registrar(http, { email, role: "postulante" });
      const { personaId } = await personaDe(token, email);
      const creado = await crearGrupo(token, { nombre: "Vacío" });

      const grupoInexistente = await request(http).delete(`/security/groups/${randomUUID()}`).set(con(token));
      const hijoInexistente = await request(http)
        .post("/security/groups")
        .set(con(token))
        .send({ nombre: "Nuevo", hijoIds: [randomUUID()] });
      const personaInexistente = await request(http).post(`/security/personas/${randomUUID()}/roots`).set(con(token)).send({ componenteId: creado.id });
      const raizInexistente = await request(http).post(`/security/personas/${personaId}/roots`).set(con(token)).send({ componenteId: randomUUID() });
      const raizNoAsignada = await request(http).delete(`/security/personas/${personaId}/roots/${creado.id}`).set(con(token));

      expect([grupoInexistente.status, hijoInexistente.status, personaInexistente.status, raizInexistente.status, raizNoAsignada.status]).toEqual([404, 404, 404, 404, 404]);
    });

    it("answers 400 for an Accion used as a group and for a group placed inside itself", async () => {
      const token = await adminToken();
      const listar = await idDeAccion(token, "branch.list");
      const creado = await crearGrupo(token, { nombre: "Solo listar" });

      const accionComoPadre = await request(http).post("/security/groups").set(con(token)).send({ nombre: "Nuevo", padreId: listar });
      const accionComoObjetivo = await request(http).patch(`/security/groups/${listar}`).set(con(token)).send({ nombre: "X" });
      const dentroDeSiMismo = await request(http).patch(`/security/groups/${creado.id}`).set(con(token)).send({ padreId: creado.id });
      const hijoAncestro = await request(http)
        .patch(`/security/groups/${creado.id}`)
        .set(con(token))
        .send({ padreId: (await grupos(token)).find((grupo) => grupo.nombre === "Pipeline")?.id, hijoIds: [] });
      const hijoEsElPadre = await request(http)
        .post("/security/groups")
        .set(con(token))
        .send({ nombre: "Otro", padreId: creado.id, hijoIds: [creado.id] });

      expect([accionComoPadre.status, accionComoObjetivo.status, dentroDeSiMismo.status, hijoEsElPadre.status]).toEqual([400, 400, 400, 400]);
      expect(hijoAncestro.status).toBe(200);
    });
  });

  describe("GET /security/matrix", () => {
    it("returns the postulante's role and Acciones grouped by Modulo and Formulario: Pipeline, Tablero, branch.list", async () => {
      const { token } = await registrar(http, { role: "postulante" });

      const response = await request(http).get("/security/matrix").set(con(token));
      const body = response.body as PermissionMatrix;

      expect(response.status).toBe(200);
      expect(body.role).toBe("postulante");
      const pipeline = body.modulos.find((modulo) => modulo.nombre === "Pipeline");
      const tablero = pipeline?.formularios.find((formulario) => formulario.nombre === "Tablero");
      expect(tablero?.acciones.map((accion) => accion.codigoAccion)).toContain("branch.list");
      expect(body.modulos.some((modulo) => modulo.nombre === "Administración")).toBe(false);
    });

    it("leaves out the Formularios and Modulos with nothing permitted", async () => {
      const { token } = await registrar(http, { role: "recruiter" });

      const body = (await request(http).get("/security/matrix").set(con(token))).body as PermissionMatrix;

      expect(body.modulos.every((modulo) => modulo.formularios.length > 0 && modulo.formularios.every((formulario) => formulario.acciones.length > 0))).toBe(true);
      expect(body.modulos.flatMap((modulo) => modulo.formularios.flatMap((formulario) => formulario.acciones)).map((accion) => accion.codigoAccion)).not.toContain("cv.upload");
    });

    it("gives an Administrador the administration Modulo", async () => {
      const token = await adminToken();

      const body = (await request(http).get("/security/matrix").set(con(token))).body as PermissionMatrix;

      expect(body.role).toBe("administrador");
      expect(body.modulos.map((modulo) => modulo.nombre)).toContain("Administración");
    });
  });
});
