import type { CreatePersonaInput } from "@repo/models";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeTestDb, truncateAll } from "../../../../test/setup/db";
import { DrizzleListaUsuarios } from "../../users/infrastructure/drizzle-lista-usuarios.repository";
import { DrizzlePersonaRepository } from "./drizzle-persona.repository";

describe("DrizzlePersonaRepository", () => {
  const { pool, db } = makeTestDb();
  const repo = new DrizzlePersonaRepository(db);
  const listaUsuarios = new DrizzleListaUsuarios(db);

  beforeAll(async () => {
    await truncateAll(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
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

    const persona = await repo.create(input);

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

    const persona = await repo.create(input);

    expect(persona.tipo).toBe("postulante");
    expect(persona.usuarioId).toBe(user.id);
    if (persona.tipo === "postulante") {
      expect(persona.habilidadesMaster).toEqual(["typescript", "react"]);
    }

    const found = await repo.findByUsuarioId(user.id);
    expect(found).toEqual(persona);
  });

  it("findByUsuarioId returns null when no persona exists for the user", async () => {
    const found = await repo.findByUsuarioId("00000000-0000-0000-0000-000000000000");

    expect(found).toBeNull();
  });
});
