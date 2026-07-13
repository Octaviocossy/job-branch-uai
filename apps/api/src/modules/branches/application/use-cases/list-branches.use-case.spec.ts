import type { Application } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { BranchRepository } from "../../domain/branch.repository";
import { ListBranchesUseCase } from "./list-branches.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

describe("ListBranchesUseCase", () => {
  it("lists branches for the given user, forwarding the archived filter", async () => {
    const branches: Application[] = [];
    const repo = {
      findAllByUser: vi.fn().mockResolvedValue(branches),
      findById: vi.fn(),
      create: vi.fn(),
      clone: vi.fn(),
      archive: vi.fn(),
      addHito: vi.fn(),
      addFeedback: vi.fn(),
    } as unknown as BranchRepository;
    const useCase = new ListBranchesUseCase(repo, makeLogger());

    const result = await useCase.execute("u1", true);

    expect(repo.findAllByUser).toHaveBeenCalledWith("u1", { archived: true });
    expect(result).toBe(branches);
  });
});
