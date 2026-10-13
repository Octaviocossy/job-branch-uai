import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JwtPayload, JwtService } from "../../../shared/auth/jwt.service";
import { Accion } from "../domain/accion";
import { GrupoPermisos } from "../domain/grupo-permisos";
import { ContextosSeguridadService } from "./contextos-seguridad.service";
import type { ResolverPermisosUseCase } from "./use-cases/resolver-permisos.use-case";

const NOW = new Date("2026-10-13T10:00:00Z");
const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

function arbolCon(...codigos: string[]): GrupoPermisos {
  const arbol = new GrupoPermisos("persona:p1", "Raíces de la Persona");

  for (const codigo of codigos) {
    arbol.agregar(new Accion(codigo, codigo, codigo, "form-1"));
  }

  return arbol;
}

/** A resolver that answers with each tree in turn, one per call. */
function resolverQueDevuelve(...arboles: GrupoPermisos[]) {
  const execute = vi.fn();

  for (const arbol of arboles) {
    execute.mockResolvedValueOnce(arbol);
  }

  return { execute } as unknown as ResolverPermisosUseCase;
}

const tokenDe = (sub: string, iat: number, exp: number): JwtPayload => ({ sub, role: "postulante", iat, exp });

/** A JwtService whose `verify` reads the claims out of a fake token, `<sub>@<iat>@<exp>`. */
const makeJwtService = () =>
  ({
    verify: vi.fn((token: string): JwtPayload => {
      const [sub = "", iat = "", exp = ""] = token.split("@");

      return tokenDe(sub, Number(iat), Number(exp));
    }),
  }) as unknown as JwtService;

describe("ContextosSeguridadService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds the context when the session starts, so the first request finds it built", async () => {
    const iat = seconds(NOW);
    const resolver = resolverQueDevuelve(arbolCon("branch.create"));
    const service = new ContextosSeguridadService(makeJwtService(), resolver);

    await service.iniciar(`u1@${iat}@${iat + 3600}`);
    const contexto = await service.obtener(tokenDe("u1", iat, iat + 3600));

    expect(resolver.execute).toHaveBeenCalledExactlyOnceWith("u1");
    expect(contexto.tienePermiso("branch.create")).toBe(true);
  });

  it("serves every later request of a login from the context built at its start, so a grant change waits for the next login", async () => {
    const iat = seconds(NOW);
    const resolver = resolverQueDevuelve(arbolCon("branch.create"), arbolCon());
    const service = new ContextosSeguridadService(makeJwtService(), resolver);

    await service.iniciar(`u1@${iat}@${iat + 3600}`);
    const first = await service.obtener(tokenDe("u1", iat, iat + 3600));
    const second = await service.obtener(tokenDe("u1", iat, iat + 3600));

    expect(second).toBe(first);
    expect(second.tienePermiso("branch.create")).toBe(true);
    expect(resolver.execute).toHaveBeenCalledTimes(1);
  });

  it("builds a new context at the next login of the same Usuario", async () => {
    const iat = seconds(NOW);
    const service = new ContextosSeguridadService(makeJwtService(), resolverQueDevuelve(arbolCon("branch.create"), arbolCon()));

    await service.iniciar(`u1@${iat}@${iat + 3600}`);
    await service.iniciar(`u1@${iat + 60}@${iat + 3660}`);

    expect((await service.obtener(tokenDe("u1", iat, iat + 3600))).tienePermiso("branch.create")).toBe(true);
    expect((await service.obtener(tokenDe("u1", iat + 60, iat + 3660))).tienePermiso("branch.create")).toBe(false);
  });

  it("builds on first use the context of a token this process never started", async () => {
    const iat = seconds(NOW);
    const resolver = resolverQueDevuelve(arbolCon("branch.create"));
    const service = new ContextosSeguridadService(makeJwtService(), resolver);

    const contexto = await service.obtener(tokenDe("u1", iat, iat + 3600));
    await service.obtener(tokenDe("u1", iat, iat + 3600));

    expect(contexto.tienePermiso("branch.create")).toBe(true);
    expect(resolver.execute).toHaveBeenCalledTimes(1);
  });

  it("keeps the contexts of two Usuarios apart", async () => {
    const iat = seconds(NOW);
    const service = new ContextosSeguridadService(makeJwtService(), resolverQueDevuelve(arbolCon("branch.create"), arbolCon()));

    const u1 = await service.obtener(tokenDe("u1", iat, iat + 3600));
    const u2 = await service.obtener(tokenDe("u2", iat, iat + 3600));

    expect(u1.tienePermiso("branch.create")).toBe(true);
    expect(u2.tienePermiso("branch.create")).toBe(false);
  });

  it("drops the context when its token expires", async () => {
    const iat = seconds(NOW);
    const resolver = resolverQueDevuelve(arbolCon("branch.create"), arbolCon("branch.create"));
    const service = new ContextosSeguridadService(makeJwtService(), resolver);

    await service.obtener(tokenDe("u1", iat, iat + 60));
    vi.setSystemTime(new Date(NOW.getTime() + 61_000));
    await service.obtener(tokenDe("u1", iat, iat + 60));

    expect(resolver.execute).toHaveBeenCalledTimes(2);
  });

  it("builds anew for every request of a payload that carries no token identity", async () => {
    const resolver = resolverQueDevuelve(arbolCon("branch.create"), arbolCon("branch.create"));
    const service = new ContextosSeguridadService(makeJwtService(), resolver);

    await service.obtener({ sub: "u1", role: "postulante" });
    await service.obtener({ sub: "u1", role: "postulante" });

    expect(resolver.execute).toHaveBeenCalledTimes(2);
  });

  it("propagates a failure to build the context instead of starting a session without one", async () => {
    const iat = seconds(NOW);
    const resolver = { execute: vi.fn().mockRejectedValue(new Error("db down")) } as unknown as ResolverPermisosUseCase;
    const service = new ContextosSeguridadService(makeJwtService(), resolver);

    await expect(service.iniciar(`u1@${iat}@${iat + 3600}`)).rejects.toThrow("db down");
  });
});
