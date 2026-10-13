import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "./setup/app";
import { crearAdministrador, DEFAULT_PASSWORD, login, registrar } from "./setup/auth";
import { makeTestDb, type TestDatabase, truncateAll } from "./setup/db";

describe("Users (e2e)", () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication["getHttpServer"]>;
  let db: TestDatabase;
  let pool: ReturnType<typeof makeTestDb>["pool"];

  const ADMIN_EMAIL = "admin@example.com";
  const UNKNOWN_ID = "00000000-0000-0000-0000-000000000000";

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

  const con = (token: string) => ({ Authorization: `Bearer ${token}` });

  /** A registered Postulante and an Administrador, which only the seed creates (invariant 2), each with a live token. */
  const escenario = async () => {
    const postulante = await registrar(http, { role: "postulante" });
    const administrador = await crearAdministrador(app, ADMIN_EMAIL, DEFAULT_PASSWORD);

    return { postulante, administrador: administrador.toModel(), adminToken: await login(http, ADMIN_EMAIL, DEFAULT_PASSWORD) };
  };

  it("GET /users without a token is unauthorized", async () => {
    const response = await request(http).get("/users");

    expect(response.status).toBe(401);
  });

  it("GET /users/:id without a token is unauthorized", async () => {
    const response = await request(http).get(`/users/${UNKNOWN_ID}`);

    expect(response.status).toBe(401);
  });

  it("GET /users is forbidden to a postulante", async () => {
    const { postulante } = await escenario();

    const response = await request(http).get("/users").set(con(postulante.token));

    expect(response.status).toBe(403);
  });

  it("GET /users/:id is forbidden to a postulante, even for their own id", async () => {
    const { postulante } = await escenario();

    const response = await request(http).get(`/users/${postulante.user.id}`).set(con(postulante.token));

    expect(response.status).toBe(403);
  });

  it("GET /users returns the usuarios to an Administrador, without a passwordHash", async () => {
    const { postulante, administrador, adminToken } = await escenario();

    const response = await request(http).get("/users").set(con(adminToken));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body).toContainEqual(postulante.user);
    expect(response.body).toContainEqual(administrador);
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });

  it("GET /users/:id returns one usuario to an Administrador, without a passwordHash", async () => {
    const { postulante, adminToken } = await escenario();

    const response = await request(http).get(`/users/${postulante.user.id}`).set(con(adminToken));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(postulante.user);
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });

  it("GET /users/:id for an unknown id returns 404 to an Administrador", async () => {
    const { adminToken } = await escenario();

    const response = await request(http).get(`/users/${UNKNOWN_ID}`).set(con(adminToken));

    expect(response.status).toBe(404);
  });

  it("POST /users no longer exists and returns 404", async () => {
    const response = await request(http).post("/users").send({ email: "jane@example.com", nombreCompleto: "Jane Doe" });

    expect(response.status).toBe(404);
  });
});
