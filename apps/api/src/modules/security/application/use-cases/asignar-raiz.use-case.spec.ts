import { describe, expect, it, vi } from "vitest";
import { makeComponenteRepository, makeLogger } from "../../../../../test/setup/doubles";
import { ComponenteNoEncontradoError, PersonaNoEncontradaError } from "../../domain/errors/matriz-permisos.errors";
import { AsignarRaizUseCase } from "./asignar-raiz.use-case";

const makeRepository = () =>
  makeComponenteRepository({
    buscarPersona: vi.fn((id: string) => Promise.resolve(id === "p1" ? { id, tipo: "postulante" as const } : null)),
    buscarComponente: vi.fn((id: string) => Promise.resolve(id === "g1" ? { id, tipo: "grupo" as const, padreId: null } : null)),
  });

describe("AsignarRaizUseCase", () => {
  it("hands the Persona the component as a root", async () => {
    const repository = makeRepository();

    await new AsignarRaizUseCase(repository, makeLogger()).execute("p1", "g1");

    expect(repository.asignarRaices).toHaveBeenCalledWith("p1", ["g1"]);
  });

  it("rejects a Persona that does not exist", async () => {
    const repository = makeRepository();

    await expect(new AsignarRaizUseCase(repository, makeLogger()).execute("p-nada", "g1")).rejects.toBeInstanceOf(PersonaNoEncontradaError);
    expect(repository.asignarRaices).not.toHaveBeenCalled();
  });

  it("rejects a component that does not exist", async () => {
    const repository = makeRepository();

    await expect(new AsignarRaizUseCase(repository, makeLogger()).execute("p1", "g-nada")).rejects.toBeInstanceOf(ComponenteNoEncontradoError);
    expect(repository.asignarRaices).not.toHaveBeenCalled();
  });

  it("logs the mutation at log level and sets the logger context to its own class name", async () => {
    const logger = makeLogger();

    await new AsignarRaizUseCase(makeRepository(), logger).execute("p1", "g1");

    expect(logger.setContext).toHaveBeenCalledWith("AsignarRaizUseCase");
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("p1"));
  });
});
