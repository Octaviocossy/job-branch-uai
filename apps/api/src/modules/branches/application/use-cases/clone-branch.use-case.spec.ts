import type { Application } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { BranchRepository } from "../../domain/branch.repository";
import { CloneBranchUseCase } from "./clone-branch.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

describe("CloneBranchUseCase", () => {
  it("returns null when the source branch does not belong to the user", async () => {
    const repo = {
      findAllByUser: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      clone: vi.fn().mockResolvedValue(null),
      archive: vi.fn(),
      addHito: vi.fn(),
      addFeedback: vi.fn(),
    } as unknown as BranchRepository;
    const useCase = new CloneBranchUseCase(repo, makeLogger());

    const result = await useCase.execute("b1", "u1");

    expect(repo.clone).toHaveBeenCalledWith("b1", "u1");
    expect(result).toBeNull();
  });

  it("returns the freshly cloned branch with status/timeline reset", async () => {
    const clone = { id: "b2", status: "Enviado", timeline: [{ status: "Enviado" }] } as unknown as Application;
    const repo = {
      findAllByUser: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      clone: vi.fn().mockResolvedValue(clone),
      archive: vi.fn(),
      addHito: vi.fn(),
      addFeedback: vi.fn(),
    } as unknown as BranchRepository;
    const useCase = new CloneBranchUseCase(repo, makeLogger());

    const result = await useCase.execute("b1", "u1");

    expect(result).toBe(clone);
  });
});
