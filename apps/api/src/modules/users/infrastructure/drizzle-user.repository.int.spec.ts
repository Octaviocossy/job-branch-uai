import type { CreateUserInput } from "@repo/models";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeTestDb, truncateAll } from "../../../../test/setup/db";
import { DrizzleUserRepository } from "./drizzle-user.repository";

describe("DrizzleUserRepository", () => {
  const { pool, db } = makeTestDb();
  const repo = new DrizzleUserRepository(db);

  beforeAll(async () => {
    await truncateAll(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);
  });

  it("persists a user and returns it with displayName mapped from display_name", async () => {
    const input: CreateUserInput = {
      email: "alice@example.com",
      displayName: "Alice",
      role: "postulante",
    };

    const user = await repo.create(input);

    expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(user.displayName).toBe(input.displayName);
    expect(user.email).toBe(input.email);
  });

  it("findById returns the created user for a known id", async () => {
    const created = await repo.create({
      email: "bob@example.com",
      displayName: "Bob",
      role: "postulante",
    });

    const found = await repo.findById(created.id);

    expect(found).toEqual(created);
  });

  it("findById returns null for a random unknown uuid", async () => {
    const found = await repo.findById("00000000-0000-0000-0000-000000000000");

    expect(found).toBeNull();
  });

  it("findAll returns [] when empty and all inserted rows when populated", async () => {
    expect(await repo.findAll()).toEqual([]);

    const first = await repo.create({
      email: "carol@example.com",
      displayName: "Carol",
      role: "postulante",
    });
    const second = await repo.create({
      email: "dave@example.com",
      displayName: "Dave",
      role: "recruiter",
    });

    const all = await repo.findAll();

    expect(all).toHaveLength(2);
    expect(all).toEqual(expect.arrayContaining([first, second]));
  });

  it("rejects inserting two users with the same email", async () => {
    const dup: CreateUserInput = {
      email: "dupe@example.com",
      displayName: "Dupe One",
      role: "postulante",
    };

    await repo.create(dup);

    await expect(repo.create({ email: dup.email, displayName: "Dupe Two", role: "postulante" })).rejects.toThrow();
  });
});
