import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { CvVersionRecord, CvVersionRepository } from "../../domain/cv-version.repository";
import { SetOutputProfileUseCase } from "./set-output-profile.use-case";

function makeRepo(overrides: Partial<CvVersionRepository> = {}): CvVersionRepository {
  return {
    findAllByUser: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateFile: vi.fn(),
    setOutputProfile: vi.fn(),
    archive: vi.fn(),
    computeRendimiento: vi.fn().mockResolvedValue({ applications: 3, interviews: 1 }),
    ...overrides,
  };
}

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

const disponible: CvVersionRecord = {
  id: "cv1",
  name: "v1",
  focus: "General",
  tags: [],
  esPerfilSalida: false,
  estado: "disponible",
  tamanioBytes: 1024,
  createdAt: "2024-01-10",
  snapshotVacanteId: null,
};

describe("SetOutputProfileUseCase", () => {
  it("throws NotFoundException when the version does not belong to the user", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const useCase = new SetOutputProfileUseCase(repo, makeLogger());

    await expect(useCase.execute("u1", "cv1")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("BR-5: rejects promoting a draft version", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue({ ...disponible, estado: "borrador" }) });
    const useCase = new SetOutputProfileUseCase(repo, makeLogger());

    await expect(useCase.execute("u1", "cv1")).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.setOutputProfile).not.toHaveBeenCalled();
  });

  it("BR-5: rejects promoting an archived version", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue({ ...disponible, estado: "archivado" }) });
    const useCase = new SetOutputProfileUseCase(repo, makeLogger());

    await expect(useCase.execute("u1", "cv1")).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.setOutputProfile).not.toHaveBeenCalled();
  });

  it("BR-5: delegates the atomic demote-then-promote to the repository for a disponible version", async () => {
    const promoted: CvVersionRecord = { ...disponible, esPerfilSalida: true, estado: "seleccionado_salida" };
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(disponible), setOutputProfile: vi.fn().mockResolvedValue(promoted) });
    const useCase = new SetOutputProfileUseCase(repo, makeLogger());

    const result = await useCase.execute("u1", "cv1");

    expect(repo.setOutputProfile).toHaveBeenCalledWith("cv1", "u1");
    expect(result.esPerfilSalida).toBe(true);
    expect(result.estado).toBe("seleccionado_salida");
  });
});
