import { type ExecutionContext, ForbiddenException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import type { ContextosSeguridadService } from "../../modules/security/application/contextos-seguridad.service";
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

function contextoCon(...codigos: string[]): ContextoSeguridad {
  const arbol = new GrupoPermisos("persona:p1", "Raíces de la Persona");

  for (const codigo of codigos) {
    arbol.agregar(new Accion(codigo, codigo, codigo, "form-1"));
  }

  return new ContextoSeguridad(arbol);
}

const makeContextos = (contexto: ContextoSeguridad) => ({ obtener: vi.fn().mockResolvedValue(contexto) }) as unknown as ContextosSeguridadService;

const requestDe = (sub: string): Partial<AuthorizedRequest> => ({ user: { sub, role: "postulante" } });

describe("PermissionsGuard", () => {
  it("allows a handler that carries no @RequiereAccion without looking anything up", async () => {
    const contextos = makeContextos(contextoCon());
    const request = requestDe("u1");
    const guard = new PermissionsGuard(makeReflector(undefined), contextos);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(contextos.obtener).not.toHaveBeenCalled();
    expect(request.contextoSeguridad).toBeUndefined();
  });

  it("looks the caller's context up by its token claims and allows an action the tree grants", async () => {
    const contextos = makeContextos(contextoCon("branch.create"));
    const request = requestDe("u1");
    const guard = new PermissionsGuard(makeReflector("branch.create"), contextos);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(contextos.obtener).toHaveBeenCalledExactlyOnceWith(request.user);
  });

  it("throws Forbidden for an action the tree does not grant", async () => {
    const guard = new PermissionsGuard(makeReflector("security.createGroup"), makeContextos(contextoCon("branch.create")));

    await expect(guard.canActivate(makeContext(requestDe("u1")))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("puts the ContextoSeguridad on the request for @ContextoActual()", async () => {
    const contexto = contextoCon("branch.create", "auth.me");
    const request = requestDe("u1");
    const guard = new PermissionsGuard(makeReflector("branch.create"), makeContextos(contexto));

    await guard.canActivate(makeContext(request));

    expect(request.contextoSeguridad).toBe(contexto);
    expect(request.contextoSeguridad?.listarAcciones().sort()).toEqual(["auth.me", "branch.create"]);
  });

  it("keeps a context already on the request instead of looking it up again", async () => {
    const contextos = makeContextos(contextoCon());
    const existente = contextoCon("branch.create");
    const request: Partial<AuthorizedRequest> = { ...requestDe("u1"), contextoSeguridad: existente };
    const guard = new PermissionsGuard(makeReflector("branch.create"), contextos);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(contextos.obtener).not.toHaveBeenCalled();
    expect(request.contextoSeguridad).toBe(existente);
  });
});
