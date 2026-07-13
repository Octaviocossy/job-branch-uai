import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { FollowupBranch, FollowupRepository } from "../../domain/followup.repository";
import { GenerateRemindersUseCase } from "./generate-reminders.use-case";

const THRESHOLDS = { warn: 7, critical: 15 };

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

describe("GenerateRemindersUseCase", () => {
  it("does not touch branches below the warn threshold", async () => {
    const now = new Date("2024-01-03T00:00:00.000Z");
    vi.useFakeTimers().setSystemTime(now);

    const repo = {
      findActiveBranches: vi.fn().mockResolvedValue([makeBranch()]),
      findBranchById: vi.fn(),
      findRecordatorioByRamaId: vi.fn(),
      upsertRecordatorio: vi.fn(),
    } as unknown as FollowupRepository;
    const useCase = new GenerateRemindersUseCase(repo, makeLogger());

    await useCase.execute("user-1", THRESHOLDS);

    expect(repo.upsertRecordatorio).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("creates a pending reminder when a branch crosses the warn threshold with no existing reminder", async () => {
    const now = new Date("2024-01-20T00:00:00.000Z");
    vi.useFakeTimers().setSystemTime(now);

    const repo = {
      findActiveBranches: vi.fn().mockResolvedValue([makeBranch()]),
      findBranchById: vi.fn(),
      findRecordatorioByRamaId: vi.fn().mockResolvedValue(null),
      upsertRecordatorio: vi.fn().mockResolvedValue({}),
    } as unknown as FollowupRepository;
    const useCase = new GenerateRemindersUseCase(repo, makeLogger());

    await useCase.execute("user-1", THRESHOLDS);

    expect(repo.upsertRecordatorio).toHaveBeenCalledWith({
      ramaId: "rama-1",
      fechaVencimiento: "2024-01-20",
      diasInactividad: 19,
      estado: "pendiente",
    });
    vi.useRealTimers();
  });

  it("skips a branch that already has a pending reminder", async () => {
    const now = new Date("2024-01-20T00:00:00.000Z");
    vi.useFakeTimers().setSystemTime(now);

    const repo = {
      findActiveBranches: vi.fn().mockResolvedValue([makeBranch()]),
      findBranchById: vi.fn(),
      findRecordatorioByRamaId: vi.fn().mockResolvedValue({ id: "r1", ramaId: "rama-1", fechaVencimiento: "2024-01-10", diasInactividad: 9, estado: "pendiente" }),
      upsertRecordatorio: vi.fn(),
    } as unknown as FollowupRepository;
    const useCase = new GenerateRemindersUseCase(repo, makeLogger());

    await useCase.execute("user-1", THRESHOLDS);

    expect(repo.upsertRecordatorio).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("refreshes a resolved reminder once inactivity grows past the resolved amount", async () => {
    const now = new Date("2024-01-20T00:00:00.000Z");
    vi.useFakeTimers().setSystemTime(now);

    const repo = {
      findActiveBranches: vi.fn().mockResolvedValue([makeBranch()]),
      findBranchById: vi.fn(),
      findRecordatorioByRamaId: vi.fn().mockResolvedValue({ id: "r1", ramaId: "rama-1", fechaVencimiento: "2024-01-10", diasInactividad: 9, estado: "resuelto" }),
      upsertRecordatorio: vi.fn().mockResolvedValue({}),
    } as unknown as FollowupRepository;
    const useCase = new GenerateRemindersUseCase(repo, makeLogger());

    await useCase.execute("user-1", THRESHOLDS);

    expect(repo.upsertRecordatorio).toHaveBeenCalledWith({
      ramaId: "rama-1",
      fechaVencimiento: "2024-01-20",
      diasInactividad: 19,
      estado: "pendiente",
    });
    vi.useRealTimers();
  });

  it("leaves a resolved reminder alone while inactivity has not grown beyond it", async () => {
    const now = new Date("2024-01-11T00:00:00.000Z");
    vi.useFakeTimers().setSystemTime(now);

    const repo = {
      findActiveBranches: vi.fn().mockResolvedValue([makeBranch()]),
      findBranchById: vi.fn(),
      findRecordatorioByRamaId: vi.fn().mockResolvedValue({ id: "r1", ramaId: "rama-1", fechaVencimiento: "2024-01-10", diasInactividad: 10, estado: "resuelto" }),
      upsertRecordatorio: vi.fn(),
    } as unknown as FollowupRepository;
    const useCase = new GenerateRemindersUseCase(repo, makeLogger());

    await useCase.execute("user-1", THRESHOLDS);

    expect(repo.upsertRecordatorio).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
