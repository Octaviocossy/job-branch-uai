import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { arbolCon } from "../../../test/setup/sesion-doubles";
import { ContextoSeguridad } from "../../modules/security/domain/contexto-seguridad";
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

const contextoCon = (...codigos: string[]) => new ContextoSeguridad(arbolCon(...codigos));

const requestCon = (contextoSeguridad?: ContextoSeguridad): Partial<AuthorizedRequest> => ({ user: { sub: "u1", role: "postulante" }, contextoSeguridad });

describe("PermissionsGuard", () => {
  it("allows a handler that carries no @RequiereAccion, even on a request with no context", () => {
    const guard = new PermissionsGuard(makeReflector(undefined));

    expect(guard.canActivate(makeContext(requestCon()))).toBe(true);
  });

  it("allows an action the Sesion's context grants", () => {
    const guard = new PermissionsGuard(makeReflector("branch.create"));

    expect(guard.canActivate(makeContext(requestCon(contextoCon("branch.create"))))).toBe(true);
  });

  it("throws Forbidden for an action the Sesion's context does not grant", () => {
    const guard = new PermissionsGuard(makeReflector("security.createGroup"));

    expect(() => guard.canActivate(makeContext(requestCon(contextoCon("branch.create"))))).toThrow(new ForbiddenException("Missing permission: security.createGroup"));
  });

  it("throws Forbidden when no JwtAuthGuard put a context on the request, never resolving permissions itself", () => {
    const guard = new PermissionsGuard(makeReflector("branch.create"));

    expect(() => guard.canActivate(makeContext(requestCon()))).toThrow(ForbiddenException);
  });

  it("leaves the request's context untouched", () => {
    const contexto = contextoCon("branch.create", "auth.me");
    const request = requestCon(contexto);
    const guard = new PermissionsGuard(makeReflector("branch.create"));

    guard.canActivate(makeContext(request));

    expect(request.contextoSeguridad).toBe(contexto);
    expect(request.contextoSeguridad?.listarAcciones().sort()).toEqual(["auth.me", "branch.create"]);
  });
});
