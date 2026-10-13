import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolverPermisosUseCase } from "../../modules/security/application/use-cases/resolver-permisos.use-case";
import { Accion } from "../../modules/security/domain/accion";
import { ContextoSeguridad } from "../../modules/security/domain/contexto-seguridad";
import { GrupoPermisos } from "../../modules/security/domain/grupo-permisos";
import type { AuthorizedRequest } from "../types/authorized-request";
import { PermissionsGuard } from "./permissions.guard";

function makeContext(request: Partial<AuthorizedRequest>): ExecutionContext {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const makeReflector = (codigoAccion: string | undefined) => ({ getAllAndOverride: vi.fn().mockReturnValue(codigoAccion) }) as unknown as Reflector;

function arbolCon(...codigos: string[]): GrupoPermisos {
  const arbol = new GrupoPermisos("persona:p1", "Raíces de la Persona");

  for (const codigo of codigos) {
    arbol.agregar(new Accion(codigo, codigo, codigo, "form-1"));
  }

  return arbol;
}

const makeResolver = (arbol: GrupoPermisos) => ({ execute: vi.fn().mockResolvedValue(arbol) }) as unknown as ResolverPermisosUseCase;

const requestDe = (sub: string): Partial<AuthorizedRequest> => ({ user: { sub, role: "postulante" } });

describe("PermissionsGuard", () => {
  it("allows a handler that carries no @RequiereAccion without resolving anything", async () => {
    const resolver = makeResolver(arbolCon());
    const request = requestDe("u1");
    const guard = new PermissionsGuard(makeReflector(undefined), resolver);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(resolver.execute).not.toHaveBeenCalled();
    expect(request.contextoSeguridad).toBeUndefined();
  });

  it("resolves the caller's tree by Usuario id and allows an action the tree grants", async () => {
    const resolver = makeResolver(arbolCon("branch.create"));
    const guard = new PermissionsGuard(makeReflector("branch.create"), resolver);

    await expect(guard.canActivate(makeContext(requestDe("u1")))).resolves.toBe(true);
    expect(resolver.execute).toHaveBeenCalledWith("u1");
  });

  it("throws Forbidden for an action the tree does not grant", async () => {
    const guard = new PermissionsGuard(makeReflector("security.createGroup"), makeResolver(arbolCon("branch.create")));

    await expect(guard.canActivate(makeContext(requestDe("u1")))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("puts the ContextoSeguridad on the request for @ContextoActual()", async () => {
    const request = requestDe("u1");
    const guard = new PermissionsGuard(makeReflector("branch.create"), makeResolver(arbolCon("branch.create", "auth.me")));

    await guard.canActivate(makeContext(request));

    expect(request.contextoSeguridad).toBeInstanceOf(ContextoSeguridad);
    expect(request.contextoSeguridad?.listarAcciones().sort()).toEqual(["auth.me", "branch.create"]);
  });

  it("keeps a context already on the request instead of resolving again", async () => {
    const resolver = makeResolver(arbolCon());
    const existente = new ContextoSeguridad(arbolCon("branch.create"));
    const request: Partial<AuthorizedRequest> = { ...requestDe("u1"), contextoSeguridad: existente };
    const guard = new PermissionsGuard(makeReflector("branch.create"), resolver);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(resolver.execute).not.toHaveBeenCalled();
    expect(request.contextoSeguridad).toBe(existente);
  });

  it("resolves again for every request of a payload that carries no token identity", async () => {
    const resolver = { execute: vi.fn().mockResolvedValue(arbolCon("branch.create")) } as unknown as ResolverPermisosUseCase;
    const guard = new PermissionsGuard(makeReflector("branch.create"), resolver);

    await guard.canActivate(makeContext(requestDe("u1")));
    await guard.canActivate(makeContext(requestDe("u1")));

    expect(resolver.execute).toHaveBeenCalledTimes(2);
  });
});

describe("PermissionsGuard: a ContextoSeguridad lives as long as the login that built it", () => {
  const NOW = new Date("2026-10-13T10:00:00Z");
  const seconds = (date: Date) => Math.floor(date.getTime() / 1000);
  const tokenDe = (sub: string, iat: number, exp: number): Partial<AuthorizedRequest> => ({ user: { sub, role: "postulante", iat, exp } });

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds the tree once for a token and reuses it on its later requests, so a grant change waits for the next login", async () => {
    const iat = seconds(NOW);
    const resolver = { execute: vi.fn().mockResolvedValueOnce(arbolCon("branch.create")).mockResolvedValueOnce(arbolCon()) } as unknown as ResolverPermisosUseCase;
    const guard = new PermissionsGuard(makeReflector("branch.create"), resolver);

    await expect(guard.canActivate(makeContext(tokenDe("u1", iat, iat + 3600)))).resolves.toBe(true);
    await expect(guard.canActivate(makeContext(tokenDe("u1", iat, iat + 3600)))).resolves.toBe(true);
    expect(resolver.execute).toHaveBeenCalledTimes(1);
  });

  it("builds a new tree at the next login of the same Usuario", async () => {
    const iat = seconds(NOW);
    const resolver = { execute: vi.fn().mockResolvedValueOnce(arbolCon("branch.create")).mockResolvedValueOnce(arbolCon()) } as unknown as ResolverPermisosUseCase;
    const guard = new PermissionsGuard(makeReflector("branch.create"), resolver);

    await expect(guard.canActivate(makeContext(tokenDe("u1", iat, iat + 3600)))).resolves.toBe(true);
    await expect(guard.canActivate(makeContext(tokenDe("u1", iat + 60, iat + 3660)))).rejects.toBeInstanceOf(ForbiddenException);
    expect(resolver.execute).toHaveBeenCalledTimes(2);
  });

  it("keeps the trees of two Usuarios apart", async () => {
    const iat = seconds(NOW);
    const resolver = { execute: vi.fn().mockResolvedValueOnce(arbolCon("branch.create")).mockResolvedValueOnce(arbolCon()) } as unknown as ResolverPermisosUseCase;
    const guard = new PermissionsGuard(makeReflector("branch.create"), resolver);

    await expect(guard.canActivate(makeContext(tokenDe("u1", iat, iat + 3600)))).resolves.toBe(true);
    await expect(guard.canActivate(makeContext(tokenDe("u2", iat, iat + 3600)))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("drops the tree when its token expires", async () => {
    const iat = seconds(NOW);
    const resolver = { execute: vi.fn().mockResolvedValue(arbolCon("branch.create")) } as unknown as ResolverPermisosUseCase;
    const guard = new PermissionsGuard(makeReflector("branch.create"), resolver);

    await guard.canActivate(makeContext(tokenDe("u1", iat, iat + 60)));
    vi.setSystemTime(new Date(NOW.getTime() + 61_000));
    await guard.canActivate(makeContext(tokenDe("u1", iat, iat + 60)));

    expect(resolver.execute).toHaveBeenCalledTimes(2);
  });
});
