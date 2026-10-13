import { describe, expect, it, vi } from "vitest";
import { makeComponenteRepository, makeLogger } from "../../../../../test/setup/doubles";
import type { CatalogoFilas } from "../../domain/componente-permiso.repository";
import { ObtenerCatalogoUseCase } from "./obtener-catalogo.use-case";

const catalogo: CatalogoFilas = {
  modulos: [{ id: "m1", nombre: "Pipeline" }],
  formularios: [{ id: "f1", nombre: "Tablero", moduloId: "m1" }],
  acciones: [
    { id: "a1", codigoAccion: "branch.view", nombre: "Ver rama", formularioId: "f1", padreId: "g1", padreNombre: "Tablero" },
    { id: "a2", codigoAccion: "branch.archive", nombre: "Archivar rama", formularioId: "f1", padreId: null, padreNombre: null },
  ],
};

describe("ObtenerCatalogoUseCase", () => {
  it("groups the Acciones by Modulo and Formulario, each with the group that holds it", async () => {
    const repository = makeComponenteRepository({ listarCatalogo: vi.fn().mockResolvedValue(catalogo) });

    const resultado = await new ObtenerCatalogoUseCase(repository, makeLogger()).execute();

    expect(resultado).toEqual([
      {
        id: "m1",
        nombre: "Pipeline",
        formularios: [
          {
            id: "f1",
            nombre: "Tablero",
            acciones: [
              { id: "a2", codigoAccion: "branch.archive", nombre: "Archivar rama", grupo: null },
              { id: "a1", codigoAccion: "branch.view", nombre: "Ver rama", grupo: { id: "g1", nombre: "Tablero" } },
            ],
          },
        ],
      },
    ]);
  });

  it("returns an empty catalog as an empty list", async () => {
    expect(await new ObtenerCatalogoUseCase(makeComponenteRepository(), makeLogger()).execute()).toEqual([]);
  });

  it("sets the logger context to its own class name", () => {
    const logger = makeLogger();

    new ObtenerCatalogoUseCase(makeComponenteRepository(), logger);

    expect(logger.setContext).toHaveBeenCalledWith("ObtenerCatalogoUseCase");
  });
});
