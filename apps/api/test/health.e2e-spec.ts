import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "./setup/app";
import { makeTestDb, type TestDatabase, truncateAll } from "./setup/db";

describe("Health (e2e)", () => {
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

  it("GET /health returns ok", async () => {
    const response = await request(http).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
