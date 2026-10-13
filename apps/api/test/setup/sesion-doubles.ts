import { vi } from "vitest";
import { Sesion } from "../../src/modules/auth/domain/sesion";
import type { SesionRepository } from "../../src/modules/auth/domain/sesion.repository";
import { Accion } from "../../src/modules/security/domain/accion";
import { GrupoPermisos } from "../../src/modules/security/domain/grupo-permisos";

/** A `SesionRepository` whose every method is a `vi.fn()`, optionally overridden. */
export const makeSesionRepository = (overrides: Partial<SesionRepository> = {}) =>
  ({
    crear: vi.fn(),
    buscarPorToken: vi.fn().mockResolvedValue(null),
    buscarPorId: vi.fn().mockResolvedValue(null),
    guardar: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as SesionRepository;

/** A Sesion that is live until `fechaExpiracion` (an hour after `fechaEmision` unless given). */
export const makeSesion = (overrides: { id?: string; usuarioId?: string; tokenJWT?: string; fechaEmision?: Date; fechaExpiracion?: Date } = {}) => {
  const fechaEmision = overrides.fechaEmision ?? new Date("2026-10-13T10:00:00Z");

  return new Sesion(
    overrides.id ?? "s1",
    overrides.usuarioId ?? "u1",
    overrides.tokenJWT ?? "hash-of-token",
    fechaEmision,
    overrides.fechaExpiracion ?? new Date(fechaEmision.getTime() + 3_600_000),
  );
};

/** A permission tree whose root grants exactly `codigos`. */
export function arbolCon(...codigos: string[]): GrupoPermisos {
  const arbol = new GrupoPermisos("persona:p1", "Raíces de la Persona");

  for (const codigo of codigos) {
    arbol.agregar(new Accion(codigo, codigo, codigo, "form-1"));
  }

  return arbol;
}
