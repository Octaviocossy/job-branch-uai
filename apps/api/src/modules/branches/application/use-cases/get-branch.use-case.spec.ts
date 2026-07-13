import type { Application } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { BranchRepository } from "../../domain/branch.repository";
import { GetBranchUseCase } from "./get-branch.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

describe("GetBranchUseCase", () => {
  it("returns null when the branch does not belong to the user", async () => {
    const repo = {
      findAllByUser: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      clone: vi.fn(),
      archive: vi.fn(),
      addHito: vi.fn(),
      addFeedback: vi.fn(),
    } as unknown as BranchRepository;
    const useCase = new GetBranchUseCase(repo, makeLogger());

    const result = await useCase.execute("b1", "u1");

    expect(repo.findById).toHaveBeenCalledWith("b1", "u1");
    expect(result).toBeNull();
  });

  it("returns the branch when found", async () => {
    const branch = { id: "b1" } as Application;
    const repo = {
      findAllByUser: vi.fn(),
      findById: vi.fn().mockResolvedValue(branch),
      create: vi.fn(),
      clone: vi.fn(),
      archive: vi.fn(),
      addHito: vi.fn(),
      addFeedback: vi.fn(),
    } as unknown as BranchRepository;
    const useCase = new GetBranchUseCase(repo, makeLogger());

    const result = await useCase.execute("b1", "u1");

    expect(result).toBe(branch);
  });
});
