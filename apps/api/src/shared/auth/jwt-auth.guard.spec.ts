import { type ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { arbolCon } from "../../../test/setup/sesion-doubles";
import type { ValidarSesionUseCase } from "../../modules/auth/application/use-cases/validar-sesion.use-case";
import { ContextoSeguridad } from "../../modules/security/domain/contexto-seguridad";
import type { JwtPayload, JwtService } from "./jwt.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

const PAYLOAD: JwtPayload = { sub: "u1", role: "postulante", jti: "j1", iat: 1, exp: 2 };

const makeContext = (request: Record<string, unknown>) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;

const requestCon = (authorization?: string): Record<string, unknown> => ({ headers: authorization === undefined ? {} : { authorization } });

const makeJwtService = (verify = vi.fn().mockReturnValue(PAYLOAD)) => ({ sign: vi.fn(), verify }) as unknown as JwtService;

const makeValidarSesion = (resultado: Awaited<ReturnType<ValidarSesionUseCase["execute"]>>) =>
  ({ execute: vi.fn().mockResolvedValue(resultado) }) as unknown as ValidarSesionUseCase;

describe("JwtAuthGuard", () => {
  it("rejects a request with no bearer token, without looking up a Sesion", async () => {
    const validarSesion = makeValidarSesion(null);
    const guard = new JwtAuthGuard(makeJwtService(), validarSesion);

    await expect(guard.canActivate(makeContext(requestCon()))).rejects.toThrow(new UnauthorizedException("Missing bearer token"));
    await expect(guard.canActivate(makeContext(requestCon("Basic abc")))).rejects.toThrow(new UnauthorizedException("Missing bearer token"));
    expect(validarSesion.execute).not.toHaveBeenCalled();
  });

  it("rejects a token whose signature or expiry does not verify, without looking up a Sesion", async () => {
    const validarSesion = makeValidarSesion(null);
    const guard = new JwtAuthGuard(
      makeJwtService(
        vi.fn().mockImplementation(() => {
          throw new Error("jwt expired");
        }),
      ),
      validarSesion,
    );

    await expect(guard.canActivate(makeContext(requestCon("Bearer forged.jwt.token")))).rejects.toThrow(new UnauthorizedException("Invalid or expired token"));
    expect(validarSesion.execute).not.toHaveBeenCalled();
  });

  it("rejects a valid token that names no live Sesion (logged out, expired or unknown)", async () => {
    const validarSesion = makeValidarSesion(null);
    const guard = new JwtAuthGuard(makeJwtService(), validarSesion);

    await expect(guard.canActivate(makeContext(requestCon("Bearer signed.jwt.token")))).rejects.toThrow(new UnauthorizedException("Sesión inválida o expirada"));
    expect(validarSesion.execute).toHaveBeenCalledExactlyOnceWith("signed.jwt.token");
  });

  it("lets a request through on a live Sesion and attaches the claims, the sesionId and the Sesion's context", async () => {
    const contexto = new ContextoSeguridad(arbolCon("branch.create"));
    const guard = new JwtAuthGuard(makeJwtService(), makeValidarSesion({ sesionId: "s1", contexto }));
    const request = requestCon("Bearer signed.jwt.token");

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);

    expect(request.user).toEqual(PAYLOAD);
    expect(request.sesionId).toBe("s1");
    expect(request.contextoSeguridad).toBe(contexto);
  });

  it("attaches nothing to a rejected request", async () => {
    const guard = new JwtAuthGuard(makeJwtService(), makeValidarSesion(null));
    const request = requestCon("Bearer signed.jwt.token");

    await expect(guard.canActivate(makeContext(request))).rejects.toBeInstanceOf(UnauthorizedException);

    expect(request).not.toHaveProperty("user");
    expect(request).not.toHaveProperty("sesionId");
    expect(request).not.toHaveProperty("contextoSeguridad");
  });
});
