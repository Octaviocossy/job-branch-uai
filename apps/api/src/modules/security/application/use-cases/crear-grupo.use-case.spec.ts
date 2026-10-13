import { describe, expect, it, vi } from "vitest";
import { makeComponenteRepository, makeLogger } from "../../../../../test/setup/doubles";
import { CicloEnMatrizError, ComponenteNoEncontradoError, NoEsGrupoError } from "../../domain/errors/matriz-permisos.errors";
import { CrearGrupoUseCase } from "./crear-grupo.use-case";

const grupo = { id: "g-nuevo", nombre: "Nuevo", descripcion: null, padreId: null, hijos: [], personasConRaiz: 0 };

const componentes = {
  "g-padre": { id: "g-padre", tipo: "grupo", padreId: "g-abuelo" },
  "g-abuelo": { id: "g-abuelo", tipo: "grupo", padreId: null },
  "a-list": { id: "a-list", tipo: "accion", padreId: "g-tablero" },
  "a-view": { id: "a-view", tipo: "accion", padreId: "g-tablero" },
} as const;

const makeRepository = () =>
  makeComponenteRepository({
    buscarComponente: vi.fn((id: keyof typeof componentes) => Promise.resolve(componentes[id] ?? null)),
    ancestros: vi.fn().mockResolvedValue(["g-abuelo"]),
    crearGrupo: vi.fn().mockResolvedValue("g-nuevo"),
    listarGrupos: vi.fn().mockResolvedValue([grupo]),
  });

describe("CrearGrupoUseCase", () => {
  it("creates the group, moves the children into it and returns the stored group", async () => {
    const repository = makeRepository();

    const resultado = await new CrearGrupoUseCase(repository, makeLogger()).execute({ nombre: "Nuevo", descripcion: "Texto", padreId: "g-padre", hijoIds: ["a-list", "a-view"] });

    expect(repository.crearGrupo).toHaveBeenCalledWith({ nombre: "Nuevo", descripcion: "Texto", padreId: "g-padre" });
    expect(repository.reemplazarHijos).toHaveBeenCalledWith("g-nuevo", ["a-list", "a-view"]);
    expect(resultado).toEqual(grupo);
  });

  it("creates a parentless, childless group with a null description by default", async () => {
    const repository = makeRepository();

    await new CrearGrupoUseCase(repository, makeLogger()).execute({ nombre: "Nuevo", hijoIds: [] });

    expect(repository.crearGrupo).toHaveBeenCalledWith({ nombre: "Nuevo", descripcion: null, padreId: null });
    expect(repository.reemplazarHijos).toHaveBeenCalledWith("g-nuevo", []);
  });

  it("moves a child listed twice once", async () => {
    const repository = makeRepository();

    await new CrearGrupoUseCase(repository, makeLogger()).execute({ nombre: "Nuevo", hijoIds: ["a-list", "a-list"] });

    expect(repository.reemplazarHijos).toHaveBeenCalledWith("g-nuevo", ["a-list"]);
  });

  it("rejects a parent that does not exist, before writing anything", async () => {
    const repository = makeRepository();

    await expect(new CrearGrupoUseCase(repository, makeLogger()).execute({ nombre: "Nuevo", padreId: "g-nada", hijoIds: [] })).rejects.toBeInstanceOf(ComponenteNoEncontradoError);
    expect(repository.crearGrupo).not.toHaveBeenCalled();
  });

  it("rejects an Accion as the parent", async () => {
    const repository = makeRepository();

    await expect(new CrearGrupoUseCase(repository, makeLogger()).execute({ nombre: "Nuevo", padreId: "a-list", hijoIds: [] })).rejects.toBeInstanceOf(NoEsGrupoError);
    expect(repository.crearGrupo).not.toHaveBeenCalled();
  });

  it("rejects a child that does not exist, before writing anything", async () => {
    const repository = makeRepository();

    await expect(new CrearGrupoUseCase(repository, makeLogger()).execute({ nombre: "Nuevo", hijoIds: ["a-list", "a-nada"] })).rejects.toBeInstanceOf(ComponenteNoEncontradoError);
    expect(repository.crearGrupo).not.toHaveBeenCalled();
  });

  it("rejects the parent itself as a child, which would put each inside the other", async () => {
    const repository = makeRepository();

    await expect(new CrearGrupoUseCase(repository, makeLogger()).execute({ nombre: "Nuevo", padreId: "g-padre", hijoIds: ["g-padre"] })).rejects.toBeInstanceOf(CicloEnMatrizError);
    expect(repository.crearGrupo).not.toHaveBeenCalled();
  });

  it("rejects an ancestor of the parent as a child", async () => {
    const repository = makeRepository();

    await expect(new CrearGrupoUseCase(repository, makeLogger()).execute({ nombre: "Nuevo", padreId: "g-padre", hijoIds: ["a-list", "g-abuelo"] })).rejects.toMatchObject({
      name: "CicloEnMatrizError",
      componenteId: "g-abuelo",
    });
    expect(repository.crearGrupo).not.toHaveBeenCalled();
  });

  it("fails when the stored group cannot be read back", async () => {
    const repository = makeRepository();
    vi.mocked(repository.listarGrupos).mockResolvedValue([]);

    await expect(new CrearGrupoUseCase(repository, makeLogger()).execute({ nombre: "Nuevo", hijoIds: [] })).rejects.toBeInstanceOf(ComponenteNoEncontradoError);
  });

  it("logs the mutation at log level and sets the logger context to its own class name", async () => {
    const logger = makeLogger();

    await new CrearGrupoUseCase(makeRepository(), logger).execute({ nombre: "Nuevo", hijoIds: [] });

    expect(logger.setContext).toHaveBeenCalledWith("CrearGrupoUseCase");
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("g-nuevo"));
  });
});
