import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { AnalyticsApplicationRow, AnalyticsReadRepository } from "../../domain/analytics-read.repository";
import { GetSourceDistributionUseCase } from "./get-source-distribution.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

describe("GetSourceDistributionUseCase", () => {
  it("counts applications per source", async () => {
    const rows: AnalyticsApplicationRow[] = [
      { id: "a", cvVersionId: "cv-1", status: "Enviado", techStack: [], source: "LinkedIn", hitoStatuses: [] },
      { id: "b", cvVersionId: "cv-1", status: "Enviado", techStack: [], source: null, hitoStatuses: [] },
    ];
    const repo = {
      findApplicationsByUser: vi.fn().mockResolvedValue(rows),
      findCvVersionIdsByUser: vi.fn(),
    } as unknown as AnalyticsReadRepository;
    const useCase = new GetSourceDistributionUseCase(repo, makeLogger());

    const result = await useCase.execute("user-1");

    expect(repo.findApplicationsByUser).toHaveBeenCalledWith("user-1");
    expect(result).toEqual([
      { source: "LinkedIn", count: 1 },
      { source: "Otro", count: 1 },
    ]);
  });
});
