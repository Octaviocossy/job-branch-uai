import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { FollowupBranch, FollowupRepository } from "../../domain/followup.repository";
import { MarkFollowupDoneUseCase } from "./mark-followup-done.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

function makeBranch(overrides: Partial<FollowupBranch> = {}): FollowupBranch {
  return {
    ramaId: "rama-1",
    usuarioId: "user-1",
    company: "Mercado Libre",
    role: "Senior Frontend Engineer",
    status: "RRHH",
    lastUpdated: "2024-01-01",
    ...overrides,
  };
}

describe("MarkFollowupDoneUseCase", () => {
  it("resolves the reminder for a branch owned by the current user", async () => {
    const now = new Date("2024-01-20T00:00:00.000Z");
    vi.useFakeTimers().setSystemTime(now);

    const resolved = { id: "r1", ramaId: "rama-1", fechaVencimiento: "2024-01-20", diasInactividad: 19, estado: "resuelto" as const };
    const repo = {
      findActiveBranches: vi.fn(),
      findBranchById: vi.fn().mockResolvedValue(makeBranch()),
      findRecordatorioByRamaId: vi.fn(),
      upsertRecordatorio: vi.fn().mockResolvedValue(resolved),
    } as unknown as FollowupRepository;
    const useCase = new MarkFollowupDoneUseCase(repo, makeLogger());

    const result = await useCase.execute("user-1", "rama-1");

    expect(repo.upsertRecordatorio).toHaveBeenCalledWith({
      ramaId: "rama-1",
      fechaVencimiento: "2024-01-20",
      diasInactividad: 19,
      estado: "resuelto",
    });
    expect(result).toEqual(resolved);
    vi.useRealTimers();
  });

  it("returns null when the branch does not exist", async () => {
    const repo = {
      findActiveBranches: vi.fn(),
      findBranchById: vi.fn().mockResolvedValue(null),
      findRecordatorioByRamaId: vi.fn(),
      upsertRecordatorio: vi.fn(),
    } as unknown as FollowupRepository;
    const useCase = new MarkFollowupDoneUseCase(repo, makeLogger());

    const result = await useCase.execute("user-1", "rama-1");

    expect(result).toBeNull();
    expect(repo.upsertRecordatorio).not.toHaveBeenCalled();
  });

  it("returns null when the branch belongs to another user", async () => {
    const repo = {
      findActiveBranches: vi.fn(),
      findBranchById: vi.fn().mockResolvedValue(makeBranch({ usuarioId: "someone-else" })),
      findRecordatorioByRamaId: vi.fn(),
      upsertRecordatorio: vi.fn(),
    } as unknown as FollowupRepository;
    const useCase = new MarkFollowupDoneUseCase(repo, makeLogger());

    const result = await useCase.execute("user-1", "rama-1");

    expect(result).toBeNull();
    expect(repo.upsertRecordatorio).not.toHaveBeenCalled();
  });
});
