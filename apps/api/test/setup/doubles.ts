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
    ...overrides,
  }) as unknown as ComponentePermisoRepository;
