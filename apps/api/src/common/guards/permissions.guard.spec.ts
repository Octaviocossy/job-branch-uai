import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import type { ResolverPermisosUseCase } from "../../modules/security/application/use-cases/resolver-permisos.use-case";
import { Accion } from "../../modules/security/domain/accion";
import { ContextoSeguridad } from "../../modules/security/domain/contexto-seguridad";
import { GrupoPermisos } from "../../modules/security/domain/grupo-permisos";
import type { AuthenticatedRequest } from "../../shared/auth/jwt-auth.guard";
import { PermissionsGuard } from "./permissions.guard";

function makeContext(request: Partial<AuthenticatedRequest>): ExecutionContext {
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

const requestDe = (sub: string): Partial<AuthenticatedRequest> => ({ user: { sub, role: "postulante" } });

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
    const request: Partial<AuthenticatedRequest> = { ...requestDe("u1"), contextoSeguridad: existente };
    const guard = new PermissionsGuard(makeReflector("branch.create"), resolver);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(resolver.execute).not.toHaveBeenCalled();
    expect(request.contextoSeguridad).toBe(existente);
  });

  it("does not cache across requests: two Usuarios of the same role get their own trees", async () => {
    const resolver = { execute: vi.fn().mockResolvedValueOnce(arbolCon("branch.create")).mockResolvedValueOnce(arbolCon()) } as unknown as ResolverPermisosUseCase;
    const guard = new PermissionsGuard(makeReflector("branch.create"), resolver);

    await expect(guard.canActivate(makeContext(requestDe("u1")))).resolves.toBe(true);
    await expect(guard.canActivate(makeContext(requestDe("u2")))).rejects.toBeInstanceOf(ForbiddenException);
    expect(resolver.execute).toHaveBeenCalledTimes(2);
  });
});
