import { describe, expect, it, vi } from "vitest";
import { makeComponenteRepository, makeLogger } from "../../../../../test/setup/doubles";
import type { CatalogoFilas } from "../../domain/componente-permiso.repository";
import type { ContextoSeguridad } from "../../domain/contexto-seguridad";
import { ObtenerMatrizUseCase } from "./obtener-matriz.use-case";

const catalogo: CatalogoFilas = {
  modulos: [
    { id: "m-pipeline", nombre: "Pipeline" },
    { id: "m-admin", nombre: "Administración" },
  ],
  formularios: [
    { id: "f-tablero", nombre: "Tablero", moduloId: "m-pipeline" },
    { id: "f-detalle", nombre: "Detalle de rama", moduloId: "m-pipeline" },
    { id: "f-matriz", nombre: "Matriz de permisos", moduloId: "m-admin" },
  ],
  acciones: [
    { id: "a-list", codigoAccion: "branch.list", nombre: "Listar ramas", formularioId: "f-tablero", padreId: "g1", padreNombre: "Tablero" },
    { id: "a-view", codigoAccion: "branch.view", nombre: "Ver rama", formularioId: "f-detalle", padreId: "g1", padreNombre: "Tablero" },
    { id: "a-groups", codigoAccion: "security.listGroups", nombre: "Listar grupos", formularioId: "f-matriz", padreId: null, padreNombre: null },
  ],
};

const contextoCon = (...permitidos: string[]) => ({ tienePermiso: vi.fn((codigo: string) => permitidos.includes(codigo)) }) as unknown as ContextoSeguridad;

describe("ObtenerMatrizUseCase", () => {
  it("keeps only the Acciones the context permits, without the group the catalog shows", async () => {
    const repository = makeComponenteRepository({ listarCatalogo: vi.fn().mockResolvedValue(catalogo) });

    const resultado = await new ObtenerMatrizUseCase(repository, makeLogger()).execute("postulante", contextoCon("branch.list"));

    expect(resultado).toEqual({
      role: "postulante",
      modulos: [
        {
          id: "m-pipeline",
          nombre: "Pipeline",
          formularios: [{ id: "f-tablero", nombre: "Tablero", acciones: [{ id: "a-list", codigoAccion: "branch.list", nombre: "Listar ramas" }] }],
        },
      ],
    });
  });

  it("drops the Formularios and Modulos left with no permitted Accion", async () => {
    const repository = makeComponenteRepository({ listarCatalogo: vi.fn().mockResolvedValue(catalogo) });

    const resultado = await new ObtenerMatrizUseCase(repository, makeLogger()).execute("administrador", contextoCon("security.listGroups"));

    expect(resultado.role).toBe("administrador");
    expect(resultado.modulos.map((modulo) => modulo.nombre)).toEqual(["Administración"]);
    expect(resultado.modulos[0]?.formularios.map((formulario) => formulario.nombre)).toEqual(["Matriz de permisos"]);
  });

  it("returns no Modulos when the context permits nothing", async () => {
    const repository = makeComponenteRepository({ listarCatalogo: vi.fn().mockResolvedValue(catalogo) });

    expect(await new ObtenerMatrizUseCase(repository, makeLogger()).execute("recruiter", contextoCon())).toEqual({ role: "recruiter", modulos: [] });
  });

  it("asks the context about each Accion's code", async () => {
    const repository = makeComponenteRepository({ listarCatalogo: vi.fn().mockResolvedValue(catalogo) });
    const contexto = contextoCon();

    await new ObtenerMatrizUseCase(repository, makeLogger()).execute("recruiter", contexto);

    expect(contexto.tienePermiso).toHaveBeenCalledWith("branch.list");
    expect(contexto.tienePermiso).toHaveBeenCalledWith("security.listGroups");
  });
});
