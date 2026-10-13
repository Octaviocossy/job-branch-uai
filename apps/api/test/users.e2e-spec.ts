import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { usuarios } from "../src/database/schema/index";
import { createTestApp } from "./setup/app";
import { makeTestDb, type TestDatabase, truncateAll } from "./setup/db";

describe("Users (e2e)", () => {
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

  const insertUsuarios = async () => {
    const [jane, john] = await db
      .insert(usuarios)
      .values([
        { email: "jane@example.com", nombreCompleto: "Jane Doe", passwordHash: "hashed-secret" },
        { email: "john@example.com", nombreCompleto: "John Roe" },
      ])
      .returning();

    if (!jane || !john) {
      throw new Error("Failed to insert usuarios");
    }

    return { jane, john };
  };

  const expected = (row: { id: string; email: string; nombreCompleto: string }) => ({
    id: row.id,
    email: row.email,
    nombreCompleto: row.nombreCompleto,
    authProvider: "native",
    intentosFallidos: 0,
  });

  it("GET /users returns the usuarios without a passwordHash", async () => {
    const { jane, john } = await insertUsuarios();

    const response = await request(http).get("/users");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body).toContainEqual(expected(jane));
    expect(response.body).toContainEqual(expected(john));
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });

  it("GET /users/:id returns one usuario", async () => {
    const { jane } = await insertUsuarios();

    const response = await request(http).get(`/users/${jane.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expected(jane));
  });

  it("GET /users/:id for an unknown id returns 404", async () => {
    const response = await request(http).get("/users/00000000-0000-0000-0000-000000000000");

    expect(response.status).toBe(404);
  });

  it("POST /users no longer exists and returns 404", async () => {
    const response = await request(http).post("/users").send({ email: "jane@example.com", nombreCompleto: "Jane Doe" });

    expect(response.status).toBe(404);
  });
});
