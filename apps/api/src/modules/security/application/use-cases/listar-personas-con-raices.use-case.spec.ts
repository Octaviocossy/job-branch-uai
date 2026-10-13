import { describe, expect, it, vi } from "vitest";
import { makeComponenteRepository, makeLogger } from "../../../../../test/setup/doubles";
import { ListarPersonasConRaicesUseCase } from "./listar-personas-con-raices.use-case";

describe("ListarPersonasConRaicesUseCase", () => {
  it("returns the Personas the repository lists with their roots", async () => {
    const personas = [
      {
        personaId: "p1",
        tipo: "postulante",
        usuario: { id: "u1", email: "a@example.com", nombreCompleto: "A" },
        raices: [{ id: "g1", nombre: "Pipeline", tipo: "grupo" }],
      },
    ];
    const repository = makeComponenteRepository({ listarPersonasConRaices: vi.fn().mockResolvedValue(personas) });

    expect(await new ListarPersonasConRaicesUseCase(repository, makeLogger()).execute()).toEqual(personas);
  });

  it("sets the logger context to its own class name", () => {
    const logger = makeLogger();

    new ListarPersonasConRaicesUseCase(makeComponenteRepository(), logger);

    expect(logger.setContext).toHaveBeenCalledWith("ListarPersonasConRaicesUseCase");
  });
});
