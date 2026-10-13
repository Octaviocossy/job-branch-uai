import type { Persona } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { PersonaRepository } from "../../../persona/domain/persona.repository";
import { Accion } from "../../domain/accion";
import type { ComponentePermisoRepository } from "../../domain/componente-permiso.repository";
import { ContextoSeguridad } from "../../domain/contexto-seguridad";
import { GrupoPermisos } from "../../domain/grupo-permisos";
import { ResolverPermisosUseCase } from "./resolver-permisos.use-case";

const makeLogger = () =>
  ({
    setContext: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }) as unknown as AppLogger;

const PERSONA: Persona = { id: "p1", usuarioId: "u1", puestoCorporativo: null, tipo: "postulante", habilidadesMaster: [] };

const makePersonaRepository = (persona: Persona | null) =>
  ({
    create: vi.fn(),
    findByUsuarioId: vi.fn().mockResolvedValue(persona),
  }) as unknown as PersonaRepository;

const makeComponenteRepository = (raices: GrupoPermisos[] = []) =>
  ({
    sincronizarModulosYFormularios: vi.fn(),
    asegurarGrupos: vi.fn(),
    sincronizarAcciones: vi.fn(),
    findArbolByPersona: vi.fn().mockResolvedValue(raices),
    asignarRaices: vi.fn(),
    listarPersonasSinRaices: vi.fn(),
  }) as unknown as ComponentePermisoRepository;

function grupoCon(id: string, ...codigos: string[]): GrupoPermisos {
  const grupo = new GrupoPermisos(id, id);

  for (const codigo of codigos) {
    grupo.agregar(new Accion(codigo, codigo, codigo, "form-1"));
  }

  return grupo;
}

describe("ResolverPermisosUseCase", () => {
  it("loads the Persona of the Usuario and wraps its roots in one transient group", async () => {
    const componenteRepository = makeComponenteRepository([grupoCon("cuenta", "auth.me"), grupoCon("pipeline", "branch.create")]);
    const personaRepository = makePersonaRepository(PERSONA);
    const useCase = new ResolverPermisosUseCase(personaRepository, componenteRepository, makeLogger());

    const arbol = await useCase.execute("u1");

    expect(personaRepository.findByUsuarioId).toHaveBeenCalledWith("u1");
    expect(componenteRepository.findArbolByPersona).toHaveBeenCalledWith("p1");
    expect(arbol).toBeInstanceOf(GrupoPermisos);
    expect(arbol.obtenerHijos().map((raiz) => raiz.id)).toEqual(["cuenta", "pipeline"]);
    expect(arbol.evaluar("auth.me")).toBe(true);
    expect(arbol.evaluar("branch.create")).toBe(true);
  });

  it("grants nothing beyond the Persona's roots", async () => {
    const useCase = new ResolverPermisosUseCase(makePersonaRepository(PERSONA), makeComponenteRepository([grupoCon("cuenta", "auth.me")]), makeLogger());

    const contexto = new ContextoSeguridad(await useCase.execute("u1"));

    expect(contexto.listarAcciones()).toEqual(["auth.me"]);
    expect(contexto.tienePermiso("security.createGroup")).toBe(false);
  });

  it("returns an empty group, denying everything, when the Persona holds no roots", async () => {
    const useCase = new ResolverPermisosUseCase(makePersonaRepository(PERSONA), makeComponenteRepository([]), makeLogger());

    const arbol = await useCase.execute("u1");

    expect(arbol.obtenerHijos()).toEqual([]);
    expect(arbol.evaluar("auth.me")).toBe(false);
  });

  it("logs a warning and returns an empty group when the Usuario has no Persona", async () => {
    const logger = makeLogger();
    const componenteRepository = makeComponenteRepository();
    const useCase = new ResolverPermisosUseCase(makePersonaRepository(null), componenteRepository, logger);

    const arbol = await useCase.execute("u-orphan");

    expect(arbol.obtenerHijos()).toEqual([]);
    expect(arbol.evaluar("auth.me")).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("u-orphan"));
    expect(componenteRepository.findArbolByPersona).not.toHaveBeenCalled();
  });

  it("sets the logger context to its own class name", () => {
    const logger = makeLogger();

    new ResolverPermisosUseCase(makePersonaRepository(null), makeComponenteRepository(), logger);

    expect(logger.setContext).toHaveBeenCalledWith("ResolverPermisosUseCase");
  });
});
