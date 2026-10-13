import type { CreatePersonaInput } from "@repo/models";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeTestDb, truncateAll } from "../../../../test/setup/db";
import { componentes, personaComponentes, personas } from "../../../database/schema/index";
import { DrizzleListaUsuarios } from "../../users/infrastructure/drizzle-lista-usuarios.repository";
import { DrizzlePersonaRepository } from "./drizzle-persona.repository";

describe("DrizzlePersonaRepository", () => {
  const { pool, db } = makeTestDb();
  const repo = new DrizzlePersonaRepository(db);
  const listaUsuarios = new DrizzleListaUsuarios(db);

  // A root any Persona can hold: `persona_componentes` references `componentes`, which `truncateAll` leaves alone.
  const RAIZ_ID = "6f1c2f0e-3a4b-4c5d-8e9f-0a1b2c3d4e5f";
  const RAICES = [RAIZ_ID];

  async function sembrarRaiz() {
    await db.insert(componentes).values({ id: RAIZ_ID, tipo: "grupo", nombre: "Raíz de prueba" }).onConflictDoNothing();
  }

  beforeAll(async () => {
    await truncateAll(db);
    await sembrarRaiz();
  });

  afterAll(async () => {
    await truncateAll(db);
    await db.delete(componentes).where(eq(componentes.id, RAIZ_ID));
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
    await sembrarRaiz();
  });

  it("persists a recruiter persona and reads it back with the discriminated shape", async () => {
    const user = await listaUsuarios.agregarUsuario({
      email: "recruiter@example.com",
      nombreCompleto: "Rita Recruiter",
      passwordHash: null,
    });
    const input: CreatePersonaInput = {
      tipo: "recruiter",
      usuarioId: user.id,
      puestoCorporativo: "HR Lead",
      perNombre: "Rita",
      perApellido: "Recruiter",
      fechaContratacion: "2026-07-13",
    };

    const persona = await repo.create(input, RAICES);

    expect(persona.tipo).toBe("recruiter");
    expect(persona.usuarioId).toBe(user.id);
    if (persona.tipo === "recruiter") {
      expect(persona.perNombre).toBe("Rita");
      expect(persona.perApellido).toBe("Recruiter");
      expect(persona.fechaContratacion).toBe("2026-07-13");
    }

    const found = await repo.findByUsuarioId(user.id);
    expect(found).toEqual(persona);
  });

  it("persists a postulante persona and reads it back with the discriminated shape", async () => {
    const user = await listaUsuarios.agregarUsuario({
      email: "postulante@example.com",
      nombreCompleto: "Pablo Postulante",
      passwordHash: null,
    });
    const input: CreatePersonaInput = {
      tipo: "postulante",
      usuarioId: user.id,
      puestoCorporativo: null,
      habilidadesMaster: ["typescript", "react"],
    };

    const persona = await repo.create(input, RAICES);

    expect(persona.tipo).toBe("postulante");
    expect(persona.usuarioId).toBe(user.id);
    if (persona.tipo === "postulante") {
      expect(persona.habilidadesMaster).toEqual(["typescript", "react"]);
    }

    const found = await repo.findByUsuarioId(user.id);
    expect(found).toEqual(persona);
  });

  it("persists an administrador persona and reads it back without role-specific fields", async () => {
    const user = await listaUsuarios.agregarUsuario({
      email: "admin@example.com",
      nombreCompleto: "Ada Administradora",
      passwordHash: null,
    });
    const input: CreatePersonaInput = {
      tipo: "administrador",
      usuarioId: user.id,
      puestoCorporativo: null,
    };

    const persona = await repo.create(input, RAICES);

    expect(persona).toEqual({ id: persona.id, usuarioId: user.id, puestoCorporativo: null, tipo: "administrador" });

    const found = await repo.findByUsuarioId(user.id);
    expect(found).toEqual(persona);
  });

  it("hands the Persona its roots in the same call", async () => {
    const user = await listaUsuarios.agregarUsuario({ email: "roots@example.com", nombreCompleto: "Rosa Raíces", passwordHash: null });

    const persona = await repo.create({ tipo: "administrador", usuarioId: user.id, puestoCorporativo: null }, RAICES);

    const held = await db.select().from(personaComponentes).where(eq(personaComponentes.personaId, persona.id));
    expect(held).toEqual([{ personaId: persona.id, componenteId: RAIZ_ID }]);
  });

  it("leaves no Persona behind when the roots cannot be granted", async () => {
    const user = await listaUsuarios.agregarUsuario({ email: "rollback@example.com", nombreCompleto: "Rocío Rollback", passwordHash: null });
    const componenteInexistente = "00000000-0000-4000-8000-000000000000";

    await expect(repo.create({ tipo: "postulante", usuarioId: user.id, puestoCorporativo: null, habilidadesMaster: [] }, [RAIZ_ID, componenteInexistente])).rejects.toThrow();

    expect(await repo.findByUsuarioId(user.id)).toBeNull();
    expect(await db.select().from(personas)).toEqual([]);
    expect(await db.select().from(personaComponentes)).toEqual([]);
  });

  it("findByUsuarioId returns null when no persona exists for the user", async () => {
    const found = await repo.findByUsuarioId("00000000-0000-0000-0000-000000000000");

    expect(found).toBeNull();
  });
});
