import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Application } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { BranchRepository } from "../../domain/branch.repository";
import { BRANCH_ARCHIVED_EVENT } from "../../domain/events/branch-archived.event";
import { ArchiveBranchUseCase } from "./archive-branch.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

describe("ArchiveBranchUseCase", () => {
  it("archives the branch and emits branch.archived when found", async () => {
    const branch = { id: "b1", status: "Archivado", archived: true } as unknown as Application;
    const repo = {
      findAllByUser: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      clone: vi.fn(),
      archive: vi.fn().mockResolvedValue(branch),
      addHito: vi.fn(),
      addFeedback: vi.fn(),
    } as unknown as BranchRepository;
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const useCase = new ArchiveBranchUseCase(repo, makeLogger(), eventEmitter);

    const result = await useCase.execute("b1", "u1");

    expect(repo.archive).toHaveBeenCalledWith("b1", "u1");
    expect(eventEmitter.emit).toHaveBeenCalledWith(BRANCH_ARCHIVED_EVENT, { branch });
    expect(result).toBe(branch);
  });

  it("does not emit an event when the branch does not belong to the user", async () => {
    const repo = {
      findAllByUser: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      clone: vi.fn(),
      archive: vi.fn().mockResolvedValue(null),
      addHito: vi.fn(),
      addFeedback: vi.fn(),
    } as unknown as BranchRepository;
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const useCase = new ArchiveBranchUseCase(repo, makeLogger(), eventEmitter);

    const result = await useCase.execute("b1", "u1");

    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
