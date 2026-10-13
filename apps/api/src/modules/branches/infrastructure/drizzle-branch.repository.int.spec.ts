import type { CreateApplicationInput, CreateFeedbackInput, CreateHitoInput } from "@repo/models";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { makeTestDb, truncateAll } from "../../../../test/setup/db";
import { cvVersions, usuarios } from "../../../database/schema/index";
import { CvVersionNotFoundError } from "../domain/errors/cv-version-not-found.error";
import { DrizzleBranchRepository } from "./drizzle-branch.repository";

const CV_VERSION_NAME = "v1.0 — Fullstack General";

function baseInput(overrides: Partial<CreateApplicationInput> = {}): CreateApplicationInput {
  return {
    company: "Acme",
    role: "Backend Engineer",
    status: "Enviado",
    cvVersion: CV_VERSION_NAME,
    appliedDate: "2024-05-01",
    techStack: ["Node.js"],
    ...overrides,
  };
}

describe("DrizzleBranchRepository", () => {
  const { pool, db } = makeTestDb();
  const repo = new DrizzleBranchRepository(db);
  let userId: string;

  beforeAll(async () => {
    await truncateAll(db);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateAll(db);

    const [user] = await db.insert(usuarios).values({ email: "demo@jobbranch.dev", nombreCompleto: "Demo" }).returning();

    if (!user) {
      throw new Error("Failed to seed the demo user");
    }

    userId = user.id;

    await db.insert(cvVersions).values({ usuarioId: userId, name: CV_VERSION_NAME, focus: "General", estado: "disponible" });
  });

  async function seedOtherUser(email: string) {
    const [user] = await db.insert(usuarios).values({ email, nombreCompleto: "Other" }).returning();

    if (!user) {
      throw new Error(`Failed to seed user ${email}`);
    }

    return user.id;
  }

  it("creates a branch with an initial hito that mirrors the given status", async () => {
    const branch = await repo.create(userId, baseInput({ status: "RRHH" }));

    expect(branch.company).toBe("Acme");
    expect(branch.role).toBe("Backend Engineer");
    expect(branch.cvVersion).toBe(CV_VERSION_NAME);
    expect(branch.status).toBe("RRHH");
    expect(branch.timeline).toHaveLength(1);
    expect(branch.timeline[0]?.status).toBe("RRHH");
  });

  it("reuses an existing empresa/vacante across branches instead of duplicating them", async () => {
    const first = await repo.create(userId, baseInput());
    const second = await repo.create(userId, baseInput({ status: "RRHH" }));

    expect(second.company).toBe(first.company);
    expect(await repo.findAllByUser(userId)).toHaveLength(2);
  });

  it("throws CvVersionNotFoundError when the cv version does not exist for the user", async () => {
    await expect(repo.create(userId, baseInput({ cvVersion: "does-not-exist" }))).rejects.toThrow(CvVersionNotFoundError);
  });

  it("findById returns null for a branch owned by a different user", async () => {
    const branch = await repo.create(userId, baseInput());
    const otherUserId = await seedOtherUser("other1@jobbranch.dev");

    expect(await repo.findById(branch.id, otherUserId)).toBeNull();
  });

  it("findAllByUser filters by archived", async () => {
    const active = await repo.create(userId, baseInput());
    const toArchive = await repo.create(userId, baseInput({ role: "Frontend Engineer" }));
    await repo.archive(toArchive.id, userId);

    expect((await repo.findAllByUser(userId, { archived: false })).map((b) => b.id)).toEqual([active.id]);
    expect((await repo.findAllByUser(userId, { archived: true })).map((b) => b.id)).toEqual([toArchive.id]);
  });

  it("clone copies company/vacante/cvVersion/notes and resets status + timeline", async () => {
    const original = await repo.create(userId, baseInput({ notes: "Some notes" }));
    await repo.addHito(original.id, userId, { ramaId: original.id, date: "2024-05-05", status: "RRHH" } as CreateHitoInput);

    const clone = await repo.clone(original.id, userId);

    expect(clone?.id).not.toBe(original.id);
    expect(clone?.company).toBe(original.company);
    expect(clone?.role).toBe(original.role);
    expect(clone?.cvVersion).toBe(original.cvVersion);
    expect(clone?.notes).toBe("Some notes");
    expect(clone?.status).toBe("Enviado");
    expect(clone?.timeline).toHaveLength(1);
  });

  it("clone returns null for a branch that isn't the caller's", async () => {
    const branch = await repo.create(userId, baseInput());
    const otherUserId = await seedOtherUser("other2@jobbranch.dev");

    expect(await repo.clone(branch.id, otherUserId)).toBeNull();
  });

  it("archive sets archived + Archivado status and appends a hito", async () => {
    const branch = await repo.create(userId, baseInput());

    const archived = await repo.archive(branch.id, userId);

    expect(archived?.archived).toBe(true);
    expect(archived?.status).toBe("Archivado");
    expect(archived?.timeline).toHaveLength(2);
    expect(archived?.timeline.at(-1)?.status).toBe("Archivado");
  });

  it("archive returns null for a branch that isn't the caller's", async () => {
    const branch = await repo.create(userId, baseInput());
    const otherUserId = await seedOtherUser("other3@jobbranch.dev");

    expect(await repo.archive(branch.id, otherUserId)).toBeNull();
  });

  it("addHito appends exactly the created hito and updates the branch's status/lastUpdated", async () => {
    const branch = await repo.create(userId, baseInput());

    const result = await repo.addHito(branch.id, userId, { ramaId: branch.id, date: "2024-05-05", status: "RRHH", note: "Llamada" } as CreateHitoInput);

    expect(result?.hito.status).toBe("RRHH");
    expect(result?.hito.note).toBe("Llamada");
    expect(result?.application.status).toBe("RRHH");
    expect(result?.application.lastUpdated).toBe("2024-05-05");
    expect(result?.application.timeline).toHaveLength(2);
  });

  it("addHito returns null when the branch isn't the caller's", async () => {
    const branch = await repo.create(userId, baseInput());
    const otherUserId = await seedOtherUser("other4@jobbranch.dev");

    const result = await repo.addHito(branch.id, otherUserId, { ramaId: branch.id, date: "2024-05-05", status: "RRHH" } as CreateHitoInput);

    expect(result).toBeNull();
  });

  it("addFeedback attaches feedback to an owned hito", async () => {
    const branch = await repo.create(userId, baseInput());
    const hitoId = branch.timeline[0]?.id;

    if (!hitoId) {
      throw new Error("Missing seeded hito");
    }

    const input: CreateFeedbackInput = {
      hitoId,
      fechaEntrevista: "2024-05-05",
      tipoEntrevista: "Técnica",
      scoreTecnico: 8,
      scoreCultura: 7,
      comentarios: "Buen desempeño",
      habilidadesFaltantes: [],
    };

    const feedback = await repo.addFeedback(branch.id, hitoId, userId, input);

    expect(feedback?.hitoId).toBe(hitoId);
    expect(feedback?.scoreTecnico).toBe(8);
  });

  it("addFeedback returns null for a hito that doesn't belong to the caller's branch", async () => {
    const branch = await repo.create(userId, baseInput());
    const hitoId = branch.timeline[0]?.id;

    if (!hitoId) {
      throw new Error("Missing seeded hito");
    }

    const otherUserId = await seedOtherUser("other5@jobbranch.dev");

    const input: CreateFeedbackInput = {
      hitoId,
      fechaEntrevista: "2024-05-05",
      tipoEntrevista: "Técnica",
      scoreTecnico: 8,
      scoreCultura: 7,
      comentarios: "Buen desempeño",
      habilidadesFaltantes: [],
    };

    expect(await repo.addFeedback(branch.id, hitoId, otherUserId, input)).toBeNull();
  });
});
