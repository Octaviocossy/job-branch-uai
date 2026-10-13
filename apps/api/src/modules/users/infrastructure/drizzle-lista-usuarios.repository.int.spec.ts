import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeTestDb, truncateAll } from "../../../../test/setup/db";
import { personas } from "../../../database/schema/index";
import { DrizzleListaUsuarios } from "./drizzle-lista-usuarios.repository";

describe("DrizzleListaUsuarios", () => {
  const { pool, db } = makeTestDb();
  const lista = new DrizzleListaUsuarios(db);

  beforeAll(async () => {
    await truncateAll(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  it("agregarUsuario persists a usuario with no role yet", async () => {
    const usuario = await lista.agregarUsuario({ email: "alice@example.com", nombreCompleto: "Alice", passwordHash: "hash" });

    expect(usuario.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(usuario.email).toBe("alice@example.com");
    expect(usuario.nombreCompleto).toBe("Alice");
    expect(usuario.authProvider).toBe("native");
    expect(usuario.intentosFallidos).toBe(0);
    expect(usuario.obtenerRol()).toBeNull();
  });

  it("buscarPorEmail returns the Persona's tipo as the role once a Persona exists", async () => {
    const created = await lista.agregarUsuario({ email: "rita@example.com", nombreCompleto: "Rita", passwordHash: null });
    await db.insert(personas).values({ usuarioId: created.id, tipo: "recruiter", perNombre: "Rita", perApellido: "", fechaContratacion: "2026-07-13" });

    const found = await lista.buscarPorEmail("rita@example.com");

    expect(found?.id).toBe(created.id);
    expect(found?.obtenerRol()).toBe("recruiter");
  });

  it("buscarPorEmail returns null for an unknown email", async () => {
    expect(await lista.buscarPorEmail("nobody@example.com")).toBeNull();
  });

  it("buscarPorId returns the usuario with its role, and null for an unknown id", async () => {
    const created = await lista.agregarUsuario({ email: "bob@example.com", nombreCompleto: "Bob", passwordHash: null });
    await db.insert(personas).values({ usuarioId: created.id, tipo: "postulante" });

    const found = await lista.buscarPorId(created.id);

    expect(found?.toModel()).toEqual(created.toModel());
    expect(found?.obtenerRol()).toBe("postulante");
    expect(await lista.buscarPorId("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("listar returns [] when empty and every usuario when populated", async () => {
    expect(await lista.listar()).toEqual([]);

    const first = await lista.agregarUsuario({ email: "carol@example.com", nombreCompleto: "Carol", passwordHash: null });
    const second = await lista.agregarUsuario({ email: "dave@example.com", nombreCompleto: "Dave", passwordHash: null });

    const all = await lista.listar();

    expect(all.map((u) => u.id).sort()).toEqual([first.id, second.id].sort());
  });

  it("guardar persists intentosFallidos", async () => {
    const created = await lista.agregarUsuario({ email: "erin@example.com", nombreCompleto: "Erin", passwordHash: "hash" });
    created.incrementarIntentos();
    created.incrementarIntentos();

    await lista.guardar(created);

    const found = await lista.buscarPorId(created.id);
    expect(found?.intentosFallidos).toBe(2);
  });

  it("rejects adding two usuarios with the same email", async () => {
    await lista.agregarUsuario({ email: "dupe@example.com", nombreCompleto: "Dupe One", passwordHash: null });

    await expect(lista.agregarUsuario({ email: "dupe@example.com", nombreCompleto: "Dupe Two", passwordHash: null })).rejects.toThrow();
  });
});
