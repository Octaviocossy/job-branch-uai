import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { FollowupBranch, FollowupRepository } from "../../domain/followup.repository";
import type { GenerateRemindersUseCase } from "./generate-reminders.use-case";
import { ListFollowupsUseCase } from "./list-followups.use-case";

const THRESHOLDS = { warn: 7, critical: 15 };

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

function makeGenerateReminders(): GenerateRemindersUseCase {
  return { execute: vi.fn().mockResolvedValue(undefined) } as unknown as GenerateRemindersUseCase;
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

describe("ListFollowupsUseCase", () => {
  it("refreshes reminders before listing, and buckets active branches by urgency", async () => {
    const now = new Date("2024-01-20T00:00:00.000Z");
    vi.useFakeTimers().setSystemTime(now);

    const branches = [
      makeBranch({ ramaId: "ok", lastUpdated: "2024-01-19" }),
      makeBranch({ ramaId: "warn", lastUpdated: "2024-01-12" }),
      makeBranch({ ramaId: "critical", lastUpdated: "2024-01-01", recruiter: { name: "Laura García" } }),
    ];
    const repo = {
      findActiveBranches: vi.fn().mockResolvedValue(branches),
      findBranchById: vi.fn(),
      findRecordatorioByRamaId: vi.fn().mockResolvedValue(null),
      upsertRecordatorio: vi.fn(),
    } as unknown as FollowupRepository;
    const generateReminders = makeGenerateReminders();
    const useCase = new ListFollowupsUseCase(repo, generateReminders, makeLogger());

    const result = await useCase.execute("user-1", THRESHOLDS);

    expect(generateReminders.execute).toHaveBeenCalledWith("user-1", THRESHOLDS);
    expect(result.summary).toEqual({ critical: 1, warn: 1, ok: 1 });
    expect(result.thresholds).toEqual(THRESHOLDS);
    expect(result.items.map((item) => item.ramaId)).toEqual(["critical", "warn", "ok"]);
    expect(result.items.find((item) => item.ramaId === "critical")?.recruiter).toEqual({ name: "Laura García" });
    vi.useRealTimers();
  });

  it("excludes a branch whose reminder was resolved and nothing changed since", async () => {
    const now = new Date("2024-01-20T00:00:00.000Z");
    vi.useFakeTimers().setSystemTime(now);

    const repo = {
      findActiveBranches: vi.fn().mockResolvedValue([makeBranch({ lastUpdated: "2024-01-01" })]),
      findBranchById: vi.fn(),
      findRecordatorioByRamaId: vi.fn().mockResolvedValue({ id: "r1", ramaId: "rama-1", fechaVencimiento: "2024-01-20", diasInactividad: 19, estado: "resuelto" }),
      upsertRecordatorio: vi.fn(),
    } as unknown as FollowupRepository;
    const useCase = new ListFollowupsUseCase(repo, makeGenerateReminders(), makeLogger());

    const result = await useCase.execute("user-1", THRESHOLDS);

    expect(result.items).toEqual([]);
    expect(result.summary).toEqual({ critical: 0, warn: 0, ok: 0 });
    vi.useRealTimers();
  });

  it("re-includes a branch once inactivity grows past a resolved reminder's snapshot", async () => {
    const now = new Date("2024-01-25T00:00:00.000Z");
    vi.useFakeTimers().setSystemTime(now);

    const repo = {
      findActiveBranches: vi.fn().mockResolvedValue([makeBranch({ lastUpdated: "2024-01-01" })]),
      findBranchById: vi.fn(),
      findRecordatorioByRamaId: vi.fn().mockResolvedValue({ id: "r1", ramaId: "rama-1", fechaVencimiento: "2024-01-20", diasInactividad: 19, estado: "resuelto" }),
      upsertRecordatorio: vi.fn(),
    } as unknown as FollowupRepository;
    const useCase = new ListFollowupsUseCase(repo, makeGenerateReminders(), makeLogger());

    const result = await useCase.execute("user-1", THRESHOLDS);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.urgency).toBe("critical");
    vi.useRealTimers();
  });
});
