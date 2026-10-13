import { describe, expect, it, vi } from "vitest";
import { makeComponenteRepository, makeLogger } from "../../../../../test/setup/doubles";
import { ComponenteNoEncontradoError, GrupoEnUsoComoRaizError, NoEsGrupoError } from "../../domain/errors/matriz-permisos.errors";
import { EliminarGrupoUseCase } from "./eliminar-grupo.use-case";

const makeRepository = (personasConRaiz = 0) =>
  makeComponenteRepository({
    buscarComponente: vi.fn((id: string) =>
      Promise.resolve(id === "g1" ? { id, tipo: "grupo" as const, padreId: null } : id === "a1" ? { id, tipo: "accion" as const, padreId: "g1" } : null),
    ),
    contarPersonasConRaiz: vi.fn().mockResolvedValue(personasConRaiz),
  });

describe("EliminarGrupoUseCase", () => {
  it("deletes a group no Persona holds as a root", async () => {
    const repository = makeRepository();

    await new EliminarGrupoUseCase(repository, makeLogger()).execute("g1");

    expect(repository.eliminarGrupo).toHaveBeenCalledWith("g1");
  });

  it("refuses to delete a group a Persona holds as a root", async () => {
    const repository = makeRepository(2);

    await expect(new EliminarGrupoUseCase(repository, makeLogger()).execute("g1")).rejects.toMatchObject({ name: "GrupoEnUsoComoRaizError", personasConRaiz: 2 });
    expect(repository.eliminarGrupo).not.toHaveBeenCalled();
  });

  it("rejects a group that does not exist", async () => {
    const repository = makeRepository();

    await expect(new EliminarGrupoUseCase(repository, makeLogger()).execute("g-nada")).rejects.toBeInstanceOf(ComponenteNoEncontradoError);
    expect(repository.eliminarGrupo).not.toHaveBeenCalled();
  });

  it("rejects an Accion", async () => {
    const repository = makeRepository();

    await expect(new EliminarGrupoUseCase(repository, makeLogger()).execute("a1")).rejects.toBeInstanceOf(NoEsGrupoError);
    expect(repository.eliminarGrupo).not.toHaveBeenCalled();
  });

  it("counts the holders before it deletes", async () => {
    const repository = makeRepository();

    await new EliminarGrupoUseCase(repository, makeLogger()).execute("g1");

    const contar = vi.mocked(repository.contarPersonasConRaiz).mock.invocationCallOrder[0] ?? Number.NaN;
    const eliminar = vi.mocked(repository.eliminarGrupo).mock.invocationCallOrder[0] ?? Number.NaN;
    expect(contar).toBeLessThan(eliminar);
  });

  it("reports the group in use as a GrupoEnUsoComoRaizError", async () => {
    await expect(new EliminarGrupoUseCase(makeRepository(1), makeLogger()).execute("g1")).rejects.toBeInstanceOf(GrupoEnUsoComoRaizError);
  });

  it("logs the mutation at log level and sets the logger context to its own class name", async () => {
    const logger = makeLogger();

    await new EliminarGrupoUseCase(makeRepository(), logger).execute("g1");

    expect(logger.setContext).toHaveBeenCalledWith("EliminarGrupoUseCase");
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("g1"));
  });
});
