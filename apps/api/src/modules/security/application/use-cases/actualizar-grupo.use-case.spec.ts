import { describe, expect, it, vi } from "vitest";
import { makeComponenteRepository, makeLogger } from "../../../../../test/setup/doubles";
import { CicloEnMatrizError, ComponenteNoEncontradoError, NoEsGrupoError } from "../../domain/errors/matriz-permisos.errors";
import { ActualizarGrupoUseCase } from "./actualizar-grupo.use-case";

const grupo = { id: "g1", nombre: "Editado", descripcion: null, padreId: "g-padre", hijos: [], personasConRaiz: 0 };

// g-raiz > g-padre > g1 > g-hijo; a-list is an Accion.
const componentes = {
  g1: { id: "g1", tipo: "grupo", padreId: "g-padre" },
  "g-padre": { id: "g-padre", tipo: "grupo", padreId: "g-raiz" },
  "g-raiz": { id: "g-raiz", tipo: "grupo", padreId: null },
  "g-hijo": { id: "g-hijo", tipo: "grupo", padreId: "g1" },
  "g-otro": { id: "g-otro", tipo: "grupo", padreId: null },
  "a-list": { id: "a-list", tipo: "accion", padreId: "g-otro" },
} as const;

const ancestrosDe: Record<string, string[]> = {
  g1: ["g-padre", "g-raiz"],
  "g-padre": ["g-raiz"],
  "g-hijo": ["g1", "g-padre", "g-raiz"],
  "g-otro": [],
};

const makeRepository = () =>
  makeComponenteRepository({
    buscarComponente: vi.fn((id: keyof typeof componentes) => Promise.resolve(componentes[id] ?? null)),
    ancestros: vi.fn((id: string) => Promise.resolve(ancestrosDe[id] ?? [])),
    listarGrupos: vi.fn().mockResolvedValue([grupo]),
  });

const ejecutar = (repository: ReturnType<typeof makeRepository>, id: string, input: Parameters<ActualizarGrupoUseCase["execute"]>[1]) =>
  new ActualizarGrupoUseCase(repository, makeLogger()).execute(id, input);

describe("ActualizarGrupoUseCase", () => {
  it("updates the given fields and returns the stored group, leaving the children alone when hijoIds is absent", async () => {
    const repository = makeRepository();

    const resultado = await ejecutar(repository, "g1", { nombre: "Editado", descripcion: "Texto" });

    expect(repository.actualizarGrupo).toHaveBeenCalledWith("g1", { nombre: "Editado", descripcion: "Texto", padreId: undefined });
    expect(repository.reemplazarHijos).not.toHaveBeenCalled();
    expect(resultado).toEqual(grupo);
  });

  it("replaces the children when hijoIds is present, an empty list included", async () => {
    const repository = makeRepository();

    await ejecutar(repository, "g1", { hijoIds: ["a-list", "g-hijo"] });
    await ejecutar(repository, "g1", { hijoIds: [] });

    expect(repository.reemplazarHijos).toHaveBeenNthCalledWith(1, "g1", ["a-list", "g-hijo"]);
    expect(repository.reemplazarHijos).toHaveBeenNthCalledWith(2, "g1", []);
  });

  it("moves the group under another group, or to the top with a null parent", async () => {
    const repository = makeRepository();

    await ejecutar(repository, "g1", { padreId: "g-otro" });
    await ejecutar(repository, "g1", { padreId: null });

    expect(repository.actualizarGrupo).toHaveBeenNthCalledWith(1, "g1", expect.objectContaining({ padreId: "g-otro" }));
    expect(repository.actualizarGrupo).toHaveBeenNthCalledWith(2, "g1", expect.objectContaining({ padreId: null }));
  });

  it("rejects a group that does not exist", async () => {
    const repository = makeRepository();

    await expect(ejecutar(repository, "g-nada", { nombre: "X" })).rejects.toBeInstanceOf(ComponenteNoEncontradoError);
    expect(repository.actualizarGrupo).not.toHaveBeenCalled();
  });

  it("rejects an Accion as the target", async () => {
    const repository = makeRepository();

    await expect(ejecutar(repository, "a-list", { nombre: "X" })).rejects.toBeInstanceOf(NoEsGrupoError);
    expect(repository.actualizarGrupo).not.toHaveBeenCalled();
  });

  it("rejects a new parent that does not exist", async () => {
    const repository = makeRepository();

    await expect(ejecutar(repository, "g1", { padreId: "g-nada" })).rejects.toBeInstanceOf(ComponenteNoEncontradoError);
    expect(repository.actualizarGrupo).not.toHaveBeenCalled();
  });

  it("rejects an Accion as the new parent", async () => {
    const repository = makeRepository();

    await expect(ejecutar(repository, "g1", { padreId: "a-list" })).rejects.toBeInstanceOf(NoEsGrupoError);
  });

  it("rejects the group itself as its parent", async () => {
    const repository = makeRepository();

    await expect(ejecutar(repository, "g1", { padreId: "g1" })).rejects.toBeInstanceOf(CicloEnMatrizError);
    expect(repository.actualizarGrupo).not.toHaveBeenCalled();
  });

  it("rejects one of its descendants as its parent", async () => {
    const repository = makeRepository();

    await expect(ejecutar(repository, "g1", { padreId: "g-hijo" })).rejects.toBeInstanceOf(CicloEnMatrizError);
    expect(repository.actualizarGrupo).not.toHaveBeenCalled();
  });

  it("rejects a child that does not exist", async () => {
    const repository = makeRepository();

    await expect(ejecutar(repository, "g1", { hijoIds: ["a-nada"] })).rejects.toBeInstanceOf(ComponenteNoEncontradoError);
    expect(repository.reemplazarHijos).not.toHaveBeenCalled();
  });

  it("rejects the group itself as one of its children", async () => {
    const repository = makeRepository();

    await expect(ejecutar(repository, "g1", { hijoIds: ["a-list", "g1"] })).rejects.toBeInstanceOf(CicloEnMatrizError);
    expect(repository.actualizarGrupo).not.toHaveBeenCalled();
  });

  it("rejects one of its ancestors as a child", async () => {
    const repository = makeRepository();

    await expect(ejecutar(repository, "g1", { hijoIds: ["g-raiz"] })).rejects.toMatchObject({ name: "CicloEnMatrizError", componenteId: "g-raiz" });
    expect(repository.reemplazarHijos).not.toHaveBeenCalled();
  });

  it("checks the children against the parent the edit gives the group", async () => {
    const repository = makeRepository();

    await expect(ejecutar(repository, "g1", { padreId: "g-otro", hijoIds: ["g-otro"] })).rejects.toBeInstanceOf(CicloEnMatrizError);
    await expect(ejecutar(repository, "g1", { padreId: "g-otro", hijoIds: ["g-padre"] })).resolves.toEqual(grupo);
  });

  it("fails when the stored group cannot be read back", async () => {
    const repository = makeRepository();
    vi.mocked(repository.listarGrupos).mockResolvedValue([]);

    await expect(ejecutar(repository, "g1", { nombre: "X" })).rejects.toBeInstanceOf(ComponenteNoEncontradoError);
  });

  it("logs the mutation at log level and sets the logger context to its own class name", async () => {
    const logger = makeLogger();

    await new ActualizarGrupoUseCase(makeRepository(), logger).execute("g1", { nombre: "X" });

    expect(logger.setContext).toHaveBeenCalledWith("ActualizarGrupoUseCase");
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("g1"));
  });
});
