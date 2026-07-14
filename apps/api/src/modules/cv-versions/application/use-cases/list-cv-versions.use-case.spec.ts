import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { CvVersionRecord, CvVersionRepository } from "../../domain/cv-version.repository";
import { ListCvVersionsUseCase } from "./list-cv-versions.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

const recordA: CvVersionRecord = {
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

const recordB: CvVersionRecord = { ...recordA, id: "cv2", name: "v2" };

describe("ListCvVersionsUseCase", () => {
  it("merges each version with its computed rendimiento", async () => {
    const computeRendimiento = vi.fn().mockResolvedValueOnce({ applications: 4, interviews: 1 }).mockResolvedValueOnce({ applications: 0, interviews: 0 });
    const repo: CvVersionRepository = {
      findAllByUser: vi.fn().mockResolvedValue([recordA, recordB]),
      findById: vi.fn(),
      create: vi.fn(),
      updateFile: vi.fn(),
      setOutputProfile: vi.fn(),
      setSnapshotVacante: vi.fn(),
      archive: vi.fn(),
      computeRendimiento,
    };
    const useCase = new ListCvVersionsUseCase(repo, makeLogger());

    const result = await useCase.execute("u1");

    expect(repo.findAllByUser).toHaveBeenCalledWith("u1");
    expect(result).toEqual([
      { ...recordA, rendimiento: { applications: 4, interviews: 1 } },
      { ...recordB, rendimiento: { applications: 0, interviews: 0 } },
    ]);
  });
});
