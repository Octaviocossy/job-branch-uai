import { describe, expect, it, vi } from "vitest";
import { makeComponenteRepository, makeLogger } from "../../../../../test/setup/doubles";
import { ListarGruposUseCase } from "./listar-grupos.use-case";

describe("ListarGruposUseCase", () => {
  it("returns the groups the repository lists", async () => {
    const grupos = [{ id: "g1", nombre: "Pipeline", descripcion: null, padreId: null, hijos: [], personasConRaiz: 2 }];
    const repository = makeComponenteRepository({ listarGrupos: vi.fn().mockResolvedValue(grupos) });

    expect(await new ListarGruposUseCase(repository, makeLogger()).execute()).toEqual(grupos);
  });

  it("sets the logger context to its own class name", () => {
    const logger = makeLogger();

    new ListarGruposUseCase(makeComponenteRepository(), logger);

    expect(logger.setContext).toHaveBeenCalledWith("ListarGruposUseCase");
  });
});
