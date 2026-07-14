import { NotFoundException } from "@nestjs/common";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeTestDb, truncateAll } from "../../../../test/setup/db";
import { cvVersions, empresas, users, vacantes } from "../../../database/schema/index";
import { DrizzleCvVersionRepository } from "./drizzle-cv-version.repository";

describe("DrizzleCvVersionRepository", () => {
  const { pool, db } = makeTestDb();
  const repo = new DrizzleCvVersionRepository(db);
  let userId: string;
  let cvVersionId: string;
  let vacanteId: string;

  beforeAll(async () => {
    await truncateAll(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);

    const [user] = await db.insert(users).values({ email: "demo@jobbranch.dev", displayName: "Demo", role: "postulante" }).returning();

    if (!user) {
      throw new Error("Failed to seed the demo user");
    }

    userId = user.id;

    const [cvVersion] = await db.insert(cvVersions).values({ usuarioId: userId, name: "v1", focus: "General", estado: "disponible" }).returning();

    if (!cvVersion) {
      throw new Error("Failed to seed the cv version");
    }

    cvVersionId = cvVersion.id;

    const [empresa] = await db.insert(empresas).values({ nombre: "Acme", industria: "Tech" }).returning();

    if (!empresa) {
      throw new Error("Failed to seed the empresa");
    }

    const [vacante] = await db
      .insert(vacantes)
      .values({ titulo: "Backend Engineer", descripcion: "...", rangoSalarial: "USD 60-80k", empresaId: empresa.id })
      .returning();

    if (!vacante) {
      throw new Error("Failed to seed the vacante");
    }

    vacanteId = vacante.id;
  });

  it("setSnapshotVacante persists snapshot_vacante_id and round-trips through findById", async () => {
    const updated = await repo.setSnapshotVacante(cvVersionId, userId, vacanteId);

    expect(updated.snapshotVacanteId).toBe(vacanteId);

    const found = await repo.findById(cvVersionId, userId);

    expect(found?.snapshotVacanteId).toBe(vacanteId);
  });

  it("setSnapshotVacante round-trips through findAllByUser", async () => {
    await repo.setSnapshotVacante(cvVersionId, userId, vacanteId);

    const all = await repo.findAllByUser(userId);

    expect(all.find((cv) => cv.id === cvVersionId)?.snapshotVacanteId).toBe(vacanteId);
  });

  it("throws NotFoundException when the cv version does not belong to the user", async () => {
    const [otherUser] = await db.insert(users).values({ email: "other@jobbranch.dev", displayName: "Other", role: "postulante" }).returning();

    if (!otherUser) {
      throw new Error("Failed to seed the other user");
    }

    await expect(repo.setSnapshotVacante(cvVersionId, otherUser.id, vacanteId)).rejects.toBeInstanceOf(NotFoundException);
  });
});
