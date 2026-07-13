import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { AnalyticsApplicationRow, AnalyticsReadRepository } from "../../domain/analytics-read.repository";
import { GetUserStatsUseCase } from "./get-user-stats.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

describe("GetUserStatsUseCase", () => {
  it("aggregates the global ROI and skill gaps for the user", async () => {
    const rows: AnalyticsApplicationRow[] = [
      { id: "a", cvVersionId: "cv-1", status: "Entrevista Técnica", techStack: [], source: null, hitoStatuses: ["Entrevista Técnica"] },
      { id: "b", cvVersionId: "cv-1", status: "Rechazado", techStack: ["Java"], source: null, hitoStatuses: [] },
      { id: "c", cvVersionId: "cv-1", status: "Rechazado", techStack: ["Java"], source: null, hitoStatuses: [] },
    ];
    const repo = {
      findApplicationsByUser: vi.fn().mockResolvedValue(rows),
      findCvVersionIdsByUser: vi.fn(),
    } as unknown as AnalyticsReadRepository;
    const useCase = new GetUserStatsUseCase(repo, makeLogger());

    const result = await useCase.execute("user-1");

    expect(repo.findApplicationsByUser).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({ roiGlobal: 1 / 3, gapHabilidades: ["Java"] });
  });
});
