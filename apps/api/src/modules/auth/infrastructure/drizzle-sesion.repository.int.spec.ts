import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeTestDb, truncateAll } from "../../../../test/setup/db";
import { sesiones } from "../../../database/schema/index";
import { DrizzleListaUsuarios } from "../../users/infrastructure/drizzle-lista-usuarios.repository";
import { DrizzleSesionRepository } from "./drizzle-sesion.repository";

const HASH = "a".repeat(64);
const EMISION = new Date("2026-10-13T10:00:00.000Z");
const EXPIRACION = new Date("2026-10-13T11:00:00.000Z");

describe("DrizzleSesionRepository", () => {
  const { pool, db } = makeTestDb();
  const repo = new DrizzleSesionRepository(db);
  const listaUsuarios = new DrizzleListaUsuarios(db);

  const crearUsuario = (email = "alice@example.com") => listaUsuarios.agregarUsuario({ email, nombreCompleto: "Alice", passwordHash: null });

  beforeAll(async () => {
    await truncateAll(db);
  });

  afterAll(async () => {
    await truncateAll(db);
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  it("crear persists a Sesion with the hash, the issue date and the expiry", async () => {
    const usuario = await crearUsuario();

    const sesion = await repo.crear({ usuarioId: usuario.id, tokenJWT: HASH, fechaEmision: EMISION, fechaExpiracion: EXPIRACION });

    expect(sesion.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(sesion.usuarioId).toBe(usuario.id);
    expect(sesion.tokenJWT).toBe(HASH);
    expect(sesion.fechaEmision).toEqual(EMISION);
    expect(sesion.fechaExpiracion).toEqual(EXPIRACION);
    expect(sesion.contextoSeguridad).toBeNull();
  });

  it("buscarPorToken finds a Sesion by the hash it was stored with, and returns null for another hash", async () => {
    const usuario = await crearUsuario();
    const creada = await repo.crear({ usuarioId: usuario.id, tokenJWT: HASH, fechaEmision: EMISION, fechaExpiracion: EXPIRACION });

    const encontrada = await repo.buscarPorToken(HASH);

    expect(encontrada?.id).toBe(creada.id);
    expect(encontrada?.fechaExpiracion).toEqual(EXPIRACION);
    expect(await repo.buscarPorToken("b".repeat(64))).toBeNull();
  });

  it("buscarPorId finds a Sesion, and returns null for an unknown id", async () => {
    const usuario = await crearUsuario();
    const creada = await repo.crear({ usuarioId: usuario.id, tokenJWT: HASH, fechaEmision: EMISION, fechaExpiracion: EXPIRACION });

    expect((await repo.buscarPorId(creada.id))?.tokenJWT).toBe(HASH);
    expect(await repo.buscarPorId("00000000-0000-0000-0000-000000000000")).toBeNull();
  });

  it("guardar persists the expiry cerrar moved to now, and the row stays", async () => {
    const usuario = await crearUsuario();
    const creada = await repo.crear({ usuarioId: usuario.id, tokenJWT: HASH, fechaEmision: EMISION, fechaExpiracion: EXPIRACION });
    const cierre = new Date("2026-10-13T10:20:00.000Z");

    creada.cerrar(cierre);
    await repo.guardar(creada);

    const releida = await repo.buscarPorToken(HASH);
    const filas = await db.select().from(sesiones).where(eq(sesiones.id, creada.id));

    expect(releida?.fechaExpiracion).toEqual(cierre);
    expect(releida?.estaVigente(new Date("2026-10-13T10:21:00.000Z"))).toBe(false);
    expect(filas).toHaveLength(1);
    expect(filas[0]?.tokenJWT).toBe(HASH);
  });

  it("guardar touches only the expiry of the Sesion it is given", async () => {
    const usuario = await crearUsuario();
    const primera = await repo.crear({ usuarioId: usuario.id, tokenJWT: HASH, fechaEmision: EMISION, fechaExpiracion: EXPIRACION });
    const segunda = await repo.crear({ usuarioId: usuario.id, tokenJWT: "b".repeat(64), fechaEmision: EMISION, fechaExpiracion: EXPIRACION });

    primera.cerrar(new Date("2026-10-13T10:20:00.000Z"));
    await repo.guardar(primera);

    expect((await repo.buscarPorId(segunda.id))?.fechaExpiracion).toEqual(EXPIRACION);
    expect((await repo.buscarPorId(primera.id))?.fechaEmision).toEqual(EMISION);
  });

  it("holds several Sesiones for one Usuario", async () => {
    const usuario = await crearUsuario();

    await repo.crear({ usuarioId: usuario.id, tokenJWT: HASH, fechaEmision: EMISION, fechaExpiracion: EXPIRACION });
    await repo.crear({ usuarioId: usuario.id, tokenJWT: "b".repeat(64), fechaEmision: EMISION, fechaExpiracion: EXPIRACION });

    expect(await db.select().from(sesiones).where(eq(sesiones.usuarioId, usuario.id))).toHaveLength(2);
  });

  it("rejects two Sesiones with the same token hash", async () => {
    const usuario = await crearUsuario();
    await repo.crear({ usuarioId: usuario.id, tokenJWT: HASH, fechaEmision: EMISION, fechaExpiracion: EXPIRACION });

    await expect(repo.crear({ usuarioId: usuario.id, tokenJWT: HASH, fechaEmision: EMISION, fechaExpiracion: EXPIRACION })).rejects.toThrow();
  });

  it("rejects a Sesion for a Usuario that does not exist", async () => {
    await expect(repo.crear({ usuarioId: "00000000-0000-0000-0000-000000000000", tokenJWT: HASH, fechaEmision: EMISION, fechaExpiracion: EXPIRACION })).rejects.toThrow();
  });
});
