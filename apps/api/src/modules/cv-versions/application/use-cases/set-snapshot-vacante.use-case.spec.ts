import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { CvVersionRecord, CvVersionRepository } from "../../domain/cv-version.repository";
import { SetSnapshotVacanteUseCase } from "./set-snapshot-vacante.use-case";

function makeRepo(overrides: Partial<CvVersionRepository> = {}): CvVersionRepository {
  return {
    findAllByUser: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateFile: vi.fn(),
    setOutputProfile: vi.fn(),
    setSnapshotVacante: vi.fn(),
    archive: vi.fn(),
    computeRendimiento: vi.fn(),
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

describe("SetSnapshotVacanteUseCase", () => {
  it("delegates to the repository with (id, usuarioId, vacanteId) and returns the updated record", async () => {
    const updated: CvVersionRecord = { ...disponible, snapshotVacanteId: "vac1" };
    const repo = makeRepo({ setSnapshotVacante: vi.fn().mockResolvedValue(updated) });
    const useCase = new SetSnapshotVacanteUseCase(repo, makeLogger());

    const result = await useCase.execute("cv1", "u1", "vac1");

    expect(repo.setSnapshotVacante).toHaveBeenCalledWith("cv1", "u1", "vac1");
    expect(result.snapshotVacanteId).toBe("vac1");
  });

  it("propagates a NotFoundException raised by the repository", async () => {
    const repo = makeRepo({ setSnapshotVacante: vi.fn().mockRejectedValue(new NotFoundException("CV version cv1 not found")) });
    const useCase = new SetSnapshotVacanteUseCase(repo, makeLogger());

    await expect(useCase.execute("cv1", "u1", "vac1")).rejects.toBeInstanceOf(NotFoundException);
  });
});
