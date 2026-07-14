import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { CvVersionRecord, CvVersionRepository } from "../../domain/cv-version.repository";
import { ArchiveCvVersionUseCase } from "./archive-cv-version.use-case";

function makeRepo(overrides: Partial<CvVersionRepository> = {}): CvVersionRepository {
  return {
    findAllByUser: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateFile: vi.fn(),
    setOutputProfile: vi.fn(),
    archive: vi.fn(),
    computeRendimiento: vi.fn().mockResolvedValue({ applications: 5, interviews: 2 }),
    ...overrides,
  };
}

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

const seleccionado: CvVersionRecord = {
  id: "cv1",
  name: "v1",
  focus: "General",
  tags: [],
  esPerfilSalida: true,
  estado: "seleccionado_salida",
  tamanioBytes: 1024,
  createdAt: "2024-01-10",
  snapshotVacanteId: null,
};

describe("ArchiveCvVersionUseCase", () => {
  it("throws NotFoundException when the version does not belong to the user", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const useCase = new ArchiveCvVersionUseCase(repo, makeLogger());

    await expect(useCase.execute("u1", "cv1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("BR-8: rejects archiving a draft (there is no hard delete)", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue({ ...seleccionado, estado: "borrador", esPerfilSalida: false }) });
    const useCase = new ArchiveCvVersionUseCase(repo, makeLogger());

    await expect(useCase.execute("u1", "cv1")).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.archive).not.toHaveBeenCalled();
  });

  it("rejects archiving an already archived version", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue({ ...seleccionado, estado: "archivado" }) });
    const useCase = new ArchiveCvVersionUseCase(repo, makeLogger());

    await expect(useCase.execute("u1", "cv1")).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.archive).not.toHaveBeenCalled();
  });

  it("BR-10: archives the current output profile and keeps its ROI history intact", async () => {
    const archived: CvVersionRecord = { ...seleccionado, estado: "archivado", esPerfilSalida: false };
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(seleccionado), archive: vi.fn().mockResolvedValue(archived) });
    const useCase = new ArchiveCvVersionUseCase(repo, makeLogger());

    const result = await useCase.execute("u1", "cv1");

    expect(repo.archive).toHaveBeenCalledWith("cv1", "u1");
    expect(result.estado).toBe("archivado");
    expect(result.rendimiento).toEqual({ applications: 5, interviews: 2 });
  });
});
