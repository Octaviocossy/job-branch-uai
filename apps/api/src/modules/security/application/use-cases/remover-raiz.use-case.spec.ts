import { describe, expect, it, vi } from "vitest";
import { makeComponenteRepository, makeLogger } from "../../../../../test/setup/doubles";
import { PersonaNoEncontradaError, RaizNoAsignadaError, UltimaRaizError } from "../../domain/errors/matriz-permisos.errors";
import { RemoverRaizUseCase } from "./remover-raiz.use-case";

const makeRepository = (raices: string[]) =>
  makeComponenteRepository({
    buscarPersona: vi.fn((id: string) => Promise.resolve(id === "p1" ? { id, tipo: "postulante" as const } : null)),
    raicesDePersona: vi.fn().mockResolvedValue(raices),
  });

describe("RemoverRaizUseCase", () => {
  it("removes a root when the Persona holds another one", async () => {
    const repository = makeRepository(["g1", "g2"]);

    await new RemoverRaizUseCase(repository, makeLogger()).execute("p1", "g1");

    expect(repository.removerRaiz).toHaveBeenCalledWith("p1", "g1");
  });

  it("rejects a Persona that does not exist", async () => {
    const repository = makeRepository(["g1", "g2"]);

    await expect(new RemoverRaizUseCase(repository, makeLogger()).execute("p-nada", "g1")).rejects.toBeInstanceOf(PersonaNoEncontradaError);
    expect(repository.removerRaiz).not.toHaveBeenCalled();
  });

  it("rejects a root the Persona does not hold", async () => {
    const repository = makeRepository(["g1", "g2"]);

    await expect(new RemoverRaizUseCase(repository, makeLogger()).execute("p1", "g3")).rejects.toBeInstanceOf(RaizNoAsignadaError);
    expect(repository.removerRaiz).not.toHaveBeenCalled();
  });

  it("refuses to remove the Persona's only root", async () => {
    const repository = makeRepository(["g1"]);

    await expect(new RemoverRaizUseCase(repository, makeLogger()).execute("p1", "g1")).rejects.toBeInstanceOf(UltimaRaizError);
    expect(repository.removerRaiz).not.toHaveBeenCalled();
  });

  it("reports a root not held before the last-root rule, even when the Persona holds one root", async () => {
    await expect(new RemoverRaizUseCase(makeRepository(["g2"]), makeLogger()).execute("p1", "g1")).rejects.toBeInstanceOf(RaizNoAsignadaError);
  });

  it("logs the mutation at log level and sets the logger context to its own class name", async () => {
    const logger = makeLogger();

    await new RemoverRaizUseCase(makeRepository(["g1", "g2"]), logger).execute("p1", "g1");

    expect(logger.setContext).toHaveBeenCalledWith("RemoverRaizUseCase");
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("p1"));
  });
});
