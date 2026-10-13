import { vi } from "vitest";
import type { ComponentePermisoRepository } from "../../src/modules/security/domain/componente-permiso.repository";
import type { AppLogger } from "../../src/shared/logger/app.logger";

/** An `AppLogger` whose every method is a `vi.fn()`. */
export const makeLogger = () =>
  ({
    setContext: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }) as unknown as AppLogger;

/** A `ComponentePermisoRepository` whose every method is a `vi.fn()`, optionally overridden. */
export const makeComponenteRepository = (overrides: Partial<ComponentePermisoRepository> = {}) =>
  ({
    sincronizarModulosYFormularios: vi.fn().mockResolvedValue(undefined),
    asegurarGrupos: vi.fn(),
    sincronizarAcciones: vi.fn().mockResolvedValue(undefined),
    findArbolByPersona: vi.fn().mockResolvedValue([]),
    asignarRaices: vi.fn(),
    listarPersonasSinRaices: vi.fn().mockResolvedValue([]),
    listarCatalogo: vi.fn().mockResolvedValue({ modulos: [], formularios: [], acciones: [] }),
    listarGrupos: vi.fn().mockResolvedValue([]),
    buscarComponente: vi.fn().mockResolvedValue(null),
    ancestros: vi.fn().mockResolvedValue([]),
    crearGrupo: vi.fn(),
    actualizarGrupo: vi.fn().mockResolvedValue(undefined),
    reemplazarHijos: vi.fn().mockResolvedValue(undefined),
    eliminarGrupo: vi.fn().mockResolvedValue(undefined),
    contarPersonasConRaiz: vi.fn().mockResolvedValue(0),
    listarPersonasConRaices: vi.fn().mockResolvedValue([]),
    buscarPersona: vi.fn().mockResolvedValue(null),
    raicesDePersona: vi.fn().mockResolvedValue([]),
    removerRaiz: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as ComponentePermisoRepository;
