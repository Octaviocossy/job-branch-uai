import type { CreateFeedbackInput, Feedback } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { BranchRepository } from "../../domain/branch.repository";
import { AddFeedbackUseCase } from "./add-feedback.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

describe("AddFeedbackUseCase", () => {
  it("attaches feedback to the hito via the repository", async () => {
    const input: CreateFeedbackInput = {
      hitoId: "h1",
      fechaEntrevista: "2024-05-05",
      tipoEntrevista: "Técnica",
      scoreTecnico: 8,
      scoreCultura: 7,
      comentarios: "Buen desempeño",
      habilidadesFaltantes: ["Kubernetes"],
    };
    const created: Feedback = { id: "f1", ...input };
    const repo = {
      findAllByUser: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      clone: vi.fn(),
      archive: vi.fn(),
      addHito: vi.fn(),
      addFeedback: vi.fn().mockResolvedValue(created),
    } as unknown as BranchRepository;
    const useCase = new AddFeedbackUseCase(repo, makeLogger());

    const result = await useCase.execute("b1", "h1", "u1", input);

    expect(repo.addFeedback).toHaveBeenCalledWith("b1", "h1", "u1", input);
    expect(result).toBe(created);
  });

  it("returns null when the hito is not found for the current user", async () => {
    const input = { habilidadesFaltantes: [] } as unknown as CreateFeedbackInput;
    const repo = {
      findAllByUser: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      clone: vi.fn(),
      archive: vi.fn(),
      addHito: vi.fn(),
      addFeedback: vi.fn().mockResolvedValue(null),
    } as unknown as BranchRepository;
    const useCase = new AddFeedbackUseCase(repo, makeLogger());

    const result = await useCase.execute("b1", "h1", "u1", input);

    expect(result).toBeNull();
  });
});
