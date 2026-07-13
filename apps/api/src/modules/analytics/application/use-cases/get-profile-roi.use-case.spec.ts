import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { AnalyticsApplicationRow, AnalyticsReadRepository } from "../../domain/analytics-read.repository";
import { GetProfileRoiUseCase } from "./get-profile-roi.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

describe("GetProfileRoiUseCase", () => {
  it("returns per-CV ROI sorted with the best-performing CV first", async () => {
    const rows: AnalyticsApplicationRow[] = [
      { id: "a", cvVersionId: "cv-low", status: "Enviado", techStack: [], source: null, hitoStatuses: [] },
      { id: "b", cvVersionId: "cv-high", status: "Oferta", techStack: [], source: null, hitoStatuses: ["Entrevista Técnica"] },
    ];
    const repo = {
      findApplicationsByUser: vi.fn().mockResolvedValue(rows),
      findCvVersionIdsByUser: vi.fn().mockResolvedValue(["cv-low", "cv-high"]),
    } as unknown as AnalyticsReadRepository;
    const useCase = new GetProfileRoiUseCase(repo, makeLogger());

    const result = await useCase.execute("user-1");

    expect(repo.findApplicationsByUser).toHaveBeenCalledWith("user-1");
    expect(repo.findCvVersionIdsByUser).toHaveBeenCalledWith("user-1");
    expect(result[0]).toEqual({ cvVersionId: "cv-high", applications: 1, interviews: 1, roi: 1 });
    expect(result[1]).toEqual({ cvVersionId: "cv-low", applications: 1, interviews: 0, roi: 0 });
  });
});
