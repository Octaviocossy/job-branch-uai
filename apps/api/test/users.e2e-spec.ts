import type { INestApplication } from "@nestjs/common";
import type { CreateUserInput } from "@repo/models";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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

  const validInput: CreateUserInput = {
    email: "jane@example.com",
    displayName: "Jane Doe",
    role: "postulante",
  };

  it("POST /users creates a user", async () => {
    const response = await request(http).post("/users").send(validInput);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject(validInput);
    expect(response.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it("POST /users with an invalid email returns 400", async () => {
    const response = await request(http).post("/users").send({ email: "not-an-email", displayName: "Jane Doe" });

    expect(response.status).toBe(400);
  });

  it("GET /users returns the created user", async () => {
    const created = await request(http).post("/users").send(validInput);

    const response = await request(http).get("/users");

    expect(response.status).toBe(200);
    expect(response.body).toContainEqual(created.body);
  });

  it("GET /users/:id returns the created user", async () => {
    const created = await request(http).post("/users").send(validInput);

    const response = await request(http).get(`/users/${created.body.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(created.body);
  });

  it("GET /users/:id for an unknown id returns 404", async () => {
    const response = await request(http).get("/users/00000000-0000-0000-0000-000000000000");

    expect(response.status).toBe(404);
  });
});
