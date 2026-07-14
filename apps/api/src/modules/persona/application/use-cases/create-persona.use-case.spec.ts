import type { Persona } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { PersonaRepository } from "../../domain/persona.repository";
import { CreatePersonaUseCase } from "./create-persona.use-case";

const makeLogger = () =>
  ({
    setContext: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }) as unknown as AppLogger;

describe("CreatePersonaUseCase", () => {
  it("delegates to the repository and logs, returning the created persona", async () => {
    const created: Persona = {
      id: "p1",
      usuarioId: "u1",
      puestoCorporativo: null,
      tipo: "postulante",
      habilidadesMaster: [],
    };
    const repo = {
      create: vi.fn().mockResolvedValue(created),
      findByUsuarioId: vi.fn(),
    } as unknown as PersonaRepository;
    const logger = makeLogger();
    const useCase = new CreatePersonaUseCase(repo, logger);

    const result = await useCase.execute({
      tipo: "postulante",
      usuarioId: "u1",
      puestoCorporativo: null,
      habilidadesMaster: [],
    });

    expect(repo.create).toHaveBeenCalledWith({
      tipo: "postulante",
      usuarioId: "u1",
      puestoCorporativo: null,
      habilidadesMaster: [],
    });
    expect(logger.setContext).toHaveBeenCalledWith("CreatePersonaUseCase");
    expect(result).toEqual(created);
  });

  it("creates a recruiter persona", async () => {
    const created: Persona = {
      id: "p2",
      usuarioId: "u2",
      puestoCorporativo: null,
      tipo: "recruiter",
      perNombre: "Jane",
      perApellido: "",
      fechaContratacion: "2026-07-13",
    };
    const repo = {
      create: vi.fn().mockResolvedValue(created),
      findByUsuarioId: vi.fn(),
    } as unknown as PersonaRepository;
    const logger = makeLogger();
    const useCase = new CreatePersonaUseCase(repo, logger);

    const result = await useCase.execute({
      tipo: "recruiter",
      usuarioId: "u2",
      puestoCorporativo: null,
      perNombre: "Jane",
      perApellido: "",
      fechaContratacion: "2026-07-13",
    });

    expect(repo.create).toHaveBeenCalledWith({
      tipo: "recruiter",
      usuarioId: "u2",
      puestoCorporativo: null,
      perNombre: "Jane",
      perApellido: "",
      fechaContratacion: "2026-07-13",
    });
    expect(result).toEqual(created);
  });
});
