import type { Application, CreateApplicationInput } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { BranchRepository } from "../../domain/branch.repository";
import { CreateBranchUseCase } from "./create-branch.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

describe("CreateBranchUseCase", () => {
  it("delegates creation to the repository and returns the created branch", async () => {
    const input: CreateApplicationInput = {
      company: "Acme",
      role: "Backend Engineer",
      status: "Enviado",
      cvVersion: "v1.0",
      appliedDate: "2024-05-01",
      techStack: ["Node.js"],
    };
    const created = { id: "b1", ...input, lastUpdated: input.appliedDate, timeline: [] } as unknown as Application;
    const repo = {
      findAllByUser: vi.fn(),
      findById: vi.fn(),
      create: vi.fn().mockResolvedValue(created),
      clone: vi.fn(),
      archive: vi.fn(),
      addHito: vi.fn(),
      addFeedback: vi.fn(),
    } as unknown as BranchRepository;
    const useCase = new CreateBranchUseCase(repo, makeLogger());

    const result = await useCase.execute("u1", input);

    expect(repo.create).toHaveBeenCalledWith("u1", input);
    expect(result).toBe(created);
  });
});
