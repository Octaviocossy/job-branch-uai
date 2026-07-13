import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Application, CreateHitoInput, Hito } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { BranchRepository } from "../../domain/branch.repository";
import { InvalidStatusTransitionError } from "../../domain/errors/invalid-status-transition.error";
import { HITO_CREATED_EVENT } from "../../domain/events/hito-created.event";
import { AddHitoUseCase } from "./add-hito.use-case";

function makeLogger(): AppLogger {
  return { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
}

function makeBranch(overrides: Partial<Application> = {}): Application {
  return {
    id: "b1",
    company: "Acme",
    role: "Backend Engineer",
    status: "Enviado",
    cvVersion: "v1.0",
    appliedDate: "2024-05-01",
    lastUpdated: "2024-05-01",
    techStack: [],
    timeline: [{ id: "h1", ramaId: "b1", date: "2024-05-01", status: "Enviado" }],
    ...overrides,
  };
}

function makeRepo(overrides: Partial<BranchRepository> = {}): BranchRepository {
  return {
    findAllByUser: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    clone: vi.fn(),
    archive: vi.fn(),
    addHito: vi.fn(),
    addFeedback: vi.fn(),
    ...overrides,
  } as unknown as BranchRepository;
}

describe("AddHitoUseCase", () => {
  it("returns null when the branch does not belong to the user", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(null) });
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const useCase = new AddHitoUseCase(repo, makeLogger(), eventEmitter);

    const result = await useCase.execute("b1", "u1", { ramaId: "b1", date: "2024-05-05", status: "RRHH" } as CreateHitoInput);

    expect(result).toBeNull();
    expect(repo.addHito).not.toHaveBeenCalled();
  });

  it("rejects a transition once the branch is already in a terminal status", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(makeBranch({ status: "Oferta" })) });
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const useCase = new AddHitoUseCase(repo, makeLogger(), eventEmitter);

    await expect(useCase.execute("b1", "u1", { ramaId: "b1", date: "2024-05-05", status: "RRHH" } as CreateHitoInput)).rejects.toThrow(InvalidStatusTransitionError);
    expect(repo.addHito).not.toHaveBeenCalled();
  });

  it("rejects setting the status directly to Archivado — use the archive endpoint instead", async () => {
    const repo = makeRepo({ findById: vi.fn().mockResolvedValue(makeBranch()) });
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const useCase = new AddHitoUseCase(repo, makeLogger(), eventEmitter);

    await expect(useCase.execute("b1", "u1", { ramaId: "b1", date: "2024-05-05", status: "Archivado" } as CreateHitoInput)).rejects.toThrow(InvalidStatusTransitionError);
    expect(repo.addHito).not.toHaveBeenCalled();
  });

  it("computes daysInStage from the last hito when not provided, persists, and emits hito.created with the exact created hito", async () => {
    const branch = makeBranch();
    const newHito: Hito = { id: "h2", ramaId: "b1", date: "2024-05-05", status: "RRHH", daysInStage: 4 };
    const updatedApplication = makeBranch({ status: "RRHH", timeline: [...branch.timeline, newHito] });
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(branch),
      addHito: vi.fn().mockResolvedValue({ application: updatedApplication, hito: newHito }),
    });
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const useCase = new AddHitoUseCase(repo, makeLogger(), eventEmitter);

    const result = await useCase.execute("b1", "u1", { ramaId: "b1", date: "2024-05-05", status: "RRHH" } as CreateHitoInput);

    expect(repo.addHito).toHaveBeenCalledWith("b1", "u1", { ramaId: "b1", date: "2024-05-05", status: "RRHH", daysInStage: 4 });
    expect(eventEmitter.emit).toHaveBeenCalledWith(HITO_CREATED_EVENT, { branchId: "b1", hito: newHito });
    expect(result).toBe(updatedApplication);
  });

  it("keeps an explicitly provided daysInStage instead of recomputing it", async () => {
    const branch = makeBranch();
    const newHito: Hito = { id: "h2", ramaId: "b1", date: "2024-05-05", status: "RRHH", daysInStage: 9 };
    const updatedApplication = makeBranch({ status: "RRHH" });
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(branch),
      addHito: vi.fn().mockResolvedValue({ application: updatedApplication, hito: newHito }),
    });
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const useCase = new AddHitoUseCase(repo, makeLogger(), eventEmitter);

    await useCase.execute("b1", "u1", { ramaId: "b1", date: "2024-05-05", status: "RRHH", daysInStage: 9 } as CreateHitoInput);

    expect(repo.addHito).toHaveBeenCalledWith("b1", "u1", { ramaId: "b1", date: "2024-05-05", status: "RRHH", daysInStage: 9 });
  });

  it("returns null and skips the event when the repository can't apply the hito", async () => {
    const branch = makeBranch();
    const repo = makeRepo({
      findById: vi.fn().mockResolvedValue(branch),
      addHito: vi.fn().mockResolvedValue(null),
    });
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const useCase = new AddHitoUseCase(repo, makeLogger(), eventEmitter);

    const result = await useCase.execute("b1", "u1", { ramaId: "b1", date: "2024-05-05", status: "RRHH" } as CreateHitoInput);

    expect(result).toBeNull();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
