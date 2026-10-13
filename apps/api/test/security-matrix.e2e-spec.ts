import type { INestApplication } from "@nestjs/common";
import type { MeResponse, PermissionMatrix } from "@repo/models";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "./setup/app";
import { crearAdministrador, DEFAULT_PASSWORD, login, registrar } from "./setup/auth";
import { makeTestDb, type TestDatabase, truncateAll } from "./setup/db";

describe("Security matrix (e2e)", () => {
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

  const me = async (token: string): Promise<MeResponse> => {
    const response = await request(http).get("/auth/me").set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);

    return response.body as MeResponse;
  };

  it("GET /auth/me lists a registered postulante's permisos: branch.create and cv.upload, not security.listGroups", async () => {
    const { token } = await registrar(http, { role: "postulante" });

    const { permisos } = await me(token);

    expect(permisos).toContain("branch.create");
    expect(permisos).toContain("cv.upload");
    expect(permisos).not.toContain("security.listGroups");
    expect(new Set(permisos).size).toBe(permisos.length);
  });

  it("GET /auth/me lists a registered recruiter's permisos: branch.archive, not cv.upload", async () => {
    const { token } = await registrar(http, { role: "recruiter" });

    const { permisos } = await me(token);

    expect(permisos).toContain("branch.archive");
    expect(permisos).not.toContain("cv.upload");
  });

  it("GET /auth/me lists an Administrador's permisos: matrix administration and usuarios, no pipeline", async () => {
    const email = "admin@example.com";
    await crearAdministrador(app, email, DEFAULT_PASSWORD);
    const token = await login(http, email, DEFAULT_PASSWORD);

    const { permisos } = await me(token);

    expect(permisos).toContain("security.listGroups");
    expect(permisos).toContain("usuario.list");
    expect(permisos.filter((codigo) => codigo.startsWith("branch."))).toEqual([]);
  });

  it("GET /security/matrix returns the caller's role and acciones", async () => {
    const { token } = await registrar(http, { role: "recruiter" });

    const response = await request(http).get("/security/matrix").set("Authorization", `Bearer ${token}`);
    const body = response.body as PermissionMatrix;

    expect(response.status).toBe(200);
    expect(body.role).toBe("recruiter");
    expect(body.acciones).toContain("branch.archive");
    expect(body.acciones).not.toContain("cv.upload");
  });

  it("a Persona's permisos come from the database: a role's default roots are handed at registration", async () => {
    const first = await registrar(http, { role: "postulante" });
    const second = await registrar(http, { role: "postulante" });

    expect((await me(first.token)).permisos.sort()).toEqual((await me(second.token)).permisos.sort());
  });

  it("GET /auth/me without a token is unauthorized", async () => {
    const response = await request(http).get("/auth/me");

    expect(response.status).toBe(401);
  });
});
