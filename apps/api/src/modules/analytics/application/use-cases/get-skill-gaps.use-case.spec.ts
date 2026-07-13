import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { AnalyticsApplicationRow, AnalyticsReadRepository } from "../../domain/analytics-read.repository";
import { GetSkillGapsUseCase } from "./get-skill-gaps.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

describe("GetSkillGapsUseCase", () => {
  it("returns technologies where rejections outweigh advances", async () => {
    const rows: AnalyticsApplicationRow[] = [
      { id: "a", cvVersionId: "cv-1", status: "Rechazado", techStack: ["Java"], source: null, hitoStatuses: [] },
      { id: "b", cvVersionId: "cv-1", status: "Rechazado", techStack: ["Java"], source: null, hitoStatuses: [] },
      { id: "c", cvVersionId: "cv-1", status: "Oferta", techStack: ["React"], source: null, hitoStatuses: [] },
    ];
    const repo = {
      findApplicationsByUser: vi.fn().mockResolvedValue(rows),
      findCvVersionIdsByUser: vi.fn(),
    } as unknown as AnalyticsReadRepository;
    const useCase = new GetSkillGapsUseCase(repo, makeLogger());

    const result = await useCase.execute("user-1");

    expect(repo.findApplicationsByUser).toHaveBeenCalledWith("user-1");
    expect(result).toEqual([{ skill: "Java", missingCount: 2 }]);
  });
});
