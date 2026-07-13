import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { AnalyticsApplicationRow, AnalyticsReadRepository } from "../../domain/analytics-read.repository";
import { GetConversionUseCase } from "./get-conversion.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

describe("GetConversionUseCase", () => {
  it("folds the user's applications into a conversion funnel", async () => {
    const rows: AnalyticsApplicationRow[] = [
      { id: "a", cvVersionId: "cv-1", status: "Oferta", techStack: [], source: null, hitoStatuses: ["Enviado", "RRHH", "Entrevista Técnica", "Oferta"] },
    ];
    const repo = {
      findApplicationsByUser: vi.fn().mockResolvedValue(rows),
      findCvVersionIdsByUser: vi.fn(),
    } as unknown as AnalyticsReadRepository;
    const useCase = new GetConversionUseCase(repo, makeLogger());

    const result = await useCase.execute("user-1");

    expect(repo.findApplicationsByUser).toHaveBeenCalledWith("user-1");
    expect(result).toEqual([
      { stage: "Enviado", count: 1, conversionRate: 1 },
      { stage: "RRHH", count: 1, conversionRate: 1 },
      { stage: "Entrevista Técnica", count: 1, conversionRate: 1 },
      { stage: "Oferta", count: 1, conversionRate: 1 },
    ]);
  });
});
