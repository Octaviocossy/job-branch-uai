import type { INestApplication } from "@nestjs/common";
import type { MeResponse } from "@repo/models";
import { eq, sql } from "drizzle-orm";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { personaComponentes, personas, sesiones } from "../src/database/schema/index";
import { hashToken } from "../src/shared/auth/token-hash";
import { createTestApp } from "./setup/app";
import { DEFAULT_PASSWORD, login, registrar } from "./setup/auth";
import { makeTestDb, type TestDatabase, truncateAll } from "./setup/db";

describe("Sesion (e2e)", () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication["getHttpServer"]>;
  let db: TestDatabase;
  let pool: ReturnType<typeof makeTestDb>["pool"];

  beforeAll(async () => {
    ({ app, http } = await createTestApp());
    ({ db, pool } = makeTestDb());
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  const me = (token: string) => request(http).get("/auth/me").set("Authorization", `Bearer ${token}`);
  const logout = (token: string) => request(http).post("/auth/logout").set("Authorization", `Bearer ${token}`);

  it("login → me → logout → the same token is unauthorized", async () => {
    const { user } = await registrar(http, { email: "alice@example.com" });
    const token = await login(http, "alice@example.com", DEFAULT_PASSWORD);

    const antes = await me(token);
    expect(antes.status).toBe(200);
    expect((antes.body as MeResponse).user.id).toBe(user.id);

    expect((await logout(token)).status).toBe(204);

    expect((await me(token)).status).toBe(401);
  });

  it("registration starts a Sesion too: the token it returns works until logout", async () => {
    const { token } = await registrar(http);

    expect((await me(token)).status).toBe(200);

    expect((await logout(token)).status).toBe(204);
    expect((await me(token)).status).toBe(401);
  });

  it("logging out is per Sesion: another login of the same Usuario keeps working", async () => {
    await registrar(http, { email: "alice@example.com" });
    const first = await login(http, "alice@example.com", DEFAULT_PASSWORD);
    const second = await login(http, "alice@example.com", DEFAULT_PASSWORD);

    expect((await logout(first)).status).toBe(204);

    expect((await me(first)).status).toBe(401);
    expect((await me(second)).status).toBe(200);
  });

  it("a logged-out token cannot log out again", async () => {
    const { token } = await registrar(http);
    await logout(token);

    expect((await logout(token)).status).toBe(401);
  });

  it("keeps the Sesion row after logout, expired, holding the token's hash and not the token", async () => {
    await registrar(http, { email: "alice@example.com" });
    const token = await login(http, "alice@example.com", DEFAULT_PASSWORD);
    await logout(token);

    const [fila] = await db
      .select({ tokenJWT: sesiones.tokenJWT, vencida: sql<boolean>`${sesiones.fechaExpiracion} <= now()` })
      .from(sesiones)
      .where(eq(sesiones.tokenJWT, hashToken(token)));

    expect(fila?.vencida).toBe(true);
    expect(fila?.tokenJWT).toMatch(/^[0-9a-f]{64}$/);
    expect(fila?.tokenJWT).not.toBe(token);
    expect(await db.select().from(sesiones).where(eq(sesiones.tokenJWT, token))).toEqual([]);
  });

  it("stores one Sesion per login, the registration one included", async () => {
    const { user } = await registrar(http, { email: "alice@example.com" });
    await login(http, "alice@example.com", DEFAULT_PASSWORD);
    await login(http, "alice@example.com", DEFAULT_PASSWORD);

    const filas = await db.select({ id: sesiones.id }).from(sesiones).where(eq(sesiones.usuarioId, user.id));

    expect(filas).toHaveLength(3);
  });

  it("a token that verifies but names no Sesion is unauthorized", async () => {
    const { token } = await registrar(http);
    await db.delete(sesiones);

    expect((await me(token)).status).toBe(401);
  });

  it("a grant change applies from the next login, not to a Sesion already started", async () => {
    const { user } = await registrar(http, { email: "alice@example.com" });
    const antes = await login(http, "alice@example.com", DEFAULT_PASSWORD);
    const [persona] = await db.select({ id: personas.id }).from(personas).where(eq(personas.usuarioId, user.id));

    // Revoke every root of the Persona behind the running Sesion's back.
    await db.delete(personaComponentes).where(eq(personaComponentes.personaId, persona?.id as string));
    const despues = await login(http, "alice@example.com", DEFAULT_PASSWORD);

    expect((await me(antes)).status).toBe(200);
    expect((await me(despues)).status).toBe(403);
  });

  it("POST /auth/logout without a token is unauthorized", async () => {
    expect((await request(http).post("/auth/logout")).status).toBe(401);
  });

  it("every other protected route also needs a live Sesion", async () => {
    const { token } = await registrar(http);
    await logout(token);

    const response = await request(http).get("/branches").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});
