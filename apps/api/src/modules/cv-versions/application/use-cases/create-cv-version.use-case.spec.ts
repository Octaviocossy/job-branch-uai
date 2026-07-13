import type { CvVersion } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { CvVersionRecord, CvVersionRepository } from "../../domain/cv-version.repository";
import { CreateCvVersionUseCase } from "./create-cv-version.use-case";

function makeRepo(overrides: Partial<CvVersionRepository> = {}): CvVersionRepository {
  return {
    findAllByUser: vi.fn().mockResolvedValue([]),
    findById: vi.fn(),
    create: vi.fn(),
    updateFile: vi.fn(),
    setOutputProfile: vi.fn(),
    archive: vi.fn(),
    computeRendimiento: vi.fn().mockResolvedValue({ applications: 0, interviews: 0 }),
    ...overrides,
  };
}

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

const record: CvVersionRecord = {
  id: "cv1",
  name: "v1",
  focus: "General",
  tags: ["fullstack"],
  esPerfilSalida: false,
  estado: "borrador",
  tamanioBytes: 0,
  createdAt: "2024-01-10",
};

describe("CreateCvVersionUseCase", () => {
  it("BR-7: uses the explicit tags override when provided", async () => {
    const repo = makeRepo({ create: vi.fn().mockResolvedValue(record) });
    const useCase = new CreateCvVersionUseCase(repo, makeLogger());

    await useCase.execute("u1", { name: "v1", focus: "General", tags: ["backend"] });

    expect(repo.findAllByUser).not.toHaveBeenCalled();
    expect(repo.create).toHaveBeenCalledWith({ usuarioId: "u1", name: "v1", focus: "General", tags: ["backend"] });
  });

  it("BR-7: inherits tags from the current output profile when none are given", async () => {
    const outputProfile: CvVersionRecord = { ...record, id: "cv0", esPerfilSalida: true, tags: ["senior", "leadership"] };
    const repo = makeRepo({
      findAllByUser: vi.fn().mockResolvedValue([record, outputProfile]),
      create: vi.fn().mockResolvedValue(record),
    });
    const useCase = new CreateCvVersionUseCase(repo, makeLogger());

    await useCase.execute("u1", { name: "v1", focus: "General" });

    expect(repo.create).toHaveBeenCalledWith({ usuarioId: "u1", name: "v1", focus: "General", tags: ["senior", "leadership"] });
  });

  it("BR-7: falls back to the first existing version's tags when there is no output profile", async () => {
    const repo = makeRepo({
      findAllByUser: vi.fn().mockResolvedValue([record]),
      create: vi.fn().mockResolvedValue(record),
    });
    const useCase = new CreateCvVersionUseCase(repo, makeLogger());

    await useCase.execute("u1", { name: "v2", focus: "General", tags: [] });

    expect(repo.create).toHaveBeenCalledWith({ usuarioId: "u1", name: "v2", focus: "General", tags: ["fullstack"] });
  });

  it("falls back to an empty tag list when the user has no prior versions", async () => {
    const repo = makeRepo({ create: vi.fn().mockResolvedValue(record) });
    const useCase = new CreateCvVersionUseCase(repo, makeLogger());

    await useCase.execute("u1", { name: "v1", focus: "General" });

    expect(repo.create).toHaveBeenCalledWith({ usuarioId: "u1", name: "v1", focus: "General", tags: [] });
  });

  it("returns the created version merged with its computed rendimiento", async () => {
    const repo = makeRepo({
      create: vi.fn().mockResolvedValue(record),
      computeRendimiento: vi.fn().mockResolvedValue({ applications: 0, interviews: 0 }),
    });
    const useCase = new CreateCvVersionUseCase(repo, makeLogger());

    const result: CvVersion = await useCase.execute("u1", { name: "v1", focus: "General", tags: [] });

    expect(result).toEqual({ ...record, rendimiento: { applications: 0, interviews: 0 } });
  });
});
