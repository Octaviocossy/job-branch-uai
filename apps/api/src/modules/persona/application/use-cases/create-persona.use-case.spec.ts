import type { Persona } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import { PersonaWithoutRootsError } from "../../domain/errors/persona-without-roots.error";
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

const RAICES = ["root-1", "root-2"];

describe("CreatePersonaUseCase", () => {
  it("delegates to the repository with the roots and logs, returning the created persona", async () => {
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

    const result = await useCase.execute(
      {
        tipo: "postulante",
        usuarioId: "u1",
        puestoCorporativo: null,
        habilidadesMaster: [],
      },
      RAICES,
    );

    expect(repo.create).toHaveBeenCalledWith(
      {
        tipo: "postulante",
        usuarioId: "u1",
        puestoCorporativo: null,
        habilidadesMaster: [],
      },
      RAICES,
    );
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

    const result = await useCase.execute(
      {
        tipo: "recruiter",
        usuarioId: "u2",
        puestoCorporativo: null,
        perNombre: "Jane",
        perApellido: "",
        fechaContratacion: "2026-07-13",
      },
      RAICES,
    );

    expect(repo.create).toHaveBeenCalledWith(
      {
        tipo: "recruiter",
        usuarioId: "u2",
        puestoCorporativo: null,
        perNombre: "Jane",
        perApellido: "",
        fechaContratacion: "2026-07-13",
      },
      RAICES,
    );
    expect(result).toEqual(created);
  });

  it("refuses to create a persona without roots, persisting nothing (invariant 12)", async () => {
    const repo = {
      create: vi.fn(),
      findByUsuarioId: vi.fn(),
    } as unknown as PersonaRepository;
    const useCase = new CreatePersonaUseCase(repo, makeLogger());

    await expect(useCase.execute({ tipo: "postulante", usuarioId: "u1", puestoCorporativo: null, habilidadesMaster: [] }, [])).rejects.toBeInstanceOf(PersonaWithoutRootsError);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("propagates a repository failure, so the caller sees a Persona that was never created", async () => {
    const repo = {
      create: vi.fn().mockRejectedValue(new Error("grant failed")),
      findByUsuarioId: vi.fn(),
    } as unknown as PersonaRepository;
    const useCase = new CreatePersonaUseCase(repo, makeLogger());

    await expect(useCase.execute({ tipo: "postulante", usuarioId: "u1", puestoCorporativo: null, habilidadesMaster: [] }, RAICES)).rejects.toThrow("grant failed");
  });
});
