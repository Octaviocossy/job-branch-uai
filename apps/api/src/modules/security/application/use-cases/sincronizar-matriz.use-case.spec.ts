import { describe, expect, it, vi } from "vitest";
import { makeComponenteRepository, makeLogger } from "../../../../../test/setup/doubles";
import { ACCIONES, FORMULARIOS, MODULOS } from "../../domain/catalogo-matriz";
import type { MatrizPermisosFactories, MatrizPermisosFactory } from "../factories/matriz-permisos.factory";
import { SincronizarMatrizUseCase } from "./sincronizar-matriz.use-case";

const makeFactory = (tipo: MatrizPermisosFactory["tipo"]) =>
  ({
    tipo,
    raicesPorDefecto: vi.fn().mockReturnValue([]),
    crear: vi.fn().mockReturnValue([]),
    sembrar: vi.fn().mockResolvedValue(undefined),
    otorgarRaices: vi.fn().mockResolvedValue(undefined),
  }) as unknown as MatrizPermisosFactory;

const makeFactories = (): MatrizPermisosFactories => ({
  postulante: makeFactory("postulante"),
  recruiter: makeFactory("recruiter"),
  administrador: makeFactory("administrador"),
});

describe("SincronizarMatrizUseCase", () => {
  it("syncs modulos and formularios, seeds every role's groups, then syncs the acciones", async () => {
    const repository = makeComponenteRepository();
    const factories = makeFactories();

    await new SincronizarMatrizUseCase(repository, factories, makeLogger()).execute();

    expect(repository.sincronizarModulosYFormularios).toHaveBeenCalledWith(MODULOS, FORMULARIOS);
    expect(repository.sincronizarAcciones).toHaveBeenCalledWith(ACCIONES);
    for (const factory of Object.values(factories)) {
      expect(factory.sembrar).toHaveBeenCalledTimes(1);
    }

    const orden = (mock: { mock: { invocationCallOrder: number[] } }) => mock.mock.invocationCallOrder[0] ?? Number.NaN;
    const primeraSiembra = Math.min(...Object.values(factories).map((factory) => orden(vi.mocked(factory.sembrar))));
    expect(orden(vi.mocked(repository.sincronizarModulosYFormularios))).toBeLessThan(primeraSiembra);
    expect(primeraSiembra).toBeLessThan(orden(vi.mocked(repository.sincronizarAcciones)));
  });

  it("hands each Persona without roots the default roots of its own role, and nobody else", async () => {
    const repository = makeComponenteRepository({
      listarPersonasSinRaices: vi.fn().mockResolvedValue([
        { personaId: "p-post", tipo: "postulante" },
        { personaId: "p-rec", tipo: "recruiter" },
        { personaId: "p-adm", tipo: "administrador" },
      ]),
    });
    const factories = makeFactories();

    await new SincronizarMatrizUseCase(repository, factories, makeLogger()).execute();

    expect(factories.postulante.otorgarRaices).toHaveBeenCalledExactlyOnceWith("p-post");
    expect(factories.recruiter.otorgarRaices).toHaveBeenCalledExactlyOnceWith("p-rec");
    expect(factories.administrador.otorgarRaices).toHaveBeenCalledExactlyOnceWith("p-adm");
  });

  it("reconciles Personas only after the acciones are synced", async () => {
    const repository = makeComponenteRepository({ listarPersonasSinRaices: vi.fn().mockResolvedValue([{ personaId: "p-post", tipo: "postulante" }]) });
    const factories = makeFactories();

    await new SincronizarMatrizUseCase(repository, factories, makeLogger()).execute();

    const sincronizarAcciones = vi.mocked(repository.sincronizarAcciones).mock.invocationCallOrder[0] ?? Number.NaN;
    const otorgar = vi.mocked(factories.postulante.otorgarRaices).mock.invocationCallOrder[0] ?? Number.NaN;
    expect(sincronizarAcciones).toBeLessThan(otorgar);
  });

  it("hands nobody roots when every Persona already holds some", async () => {
    const factories = makeFactories();

    await new SincronizarMatrizUseCase(makeComponenteRepository(), factories, makeLogger()).execute();

    for (const factory of Object.values(factories)) {
      expect(factory.otorgarRaices).not.toHaveBeenCalled();
    }
  });

  it("logs the counts and sets the logger context to its own class name", async () => {
    const logger = makeLogger();

    await new SincronizarMatrizUseCase(makeComponenteRepository(), makeFactories(), logger).execute();

    expect(logger.setContext).toHaveBeenCalledWith("SincronizarMatrizUseCase");
    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining(`${ACCIONES.length} acciones`));
  });

  it("propagates a failing step instead of swallowing it", async () => {
    const repository = makeComponenteRepository({ sincronizarAcciones: vi.fn().mockRejectedValue(new Error("db down")) });

    await expect(new SincronizarMatrizUseCase(repository, makeFactories(), makeLogger()).execute()).rejects.toThrow("db down");
  });
});
