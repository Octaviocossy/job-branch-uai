import { describe, expect, it, vi } from "vitest";
import { makeLogger } from "../../../../../test/setup/doubles";
import { arbolCon, makeSesion, makeSesionRepository } from "../../../../../test/setup/sesion-doubles";
import type { JwtService } from "../../../../shared/auth/jwt.service";
import { hashToken } from "../../../../shared/auth/token-hash";
import type { ResolverPermisosUseCase } from "../../../security/application/use-cases/resolver-permisos.use-case";
import { ContextosSesionStore } from "../contextos-sesion.store";
import { IniciarSesionUseCase } from "./iniciar-sesion.use-case";

const TOKEN = "header.payload.signature";
const EXP = 1_792_000_000;

const makeJwtService = (payload: { exp?: number } = { exp: EXP }) =>
  ({
    sign: vi.fn().mockReturnValue(TOKEN),
    verify: vi.fn().mockReturnValue({ sub: "u1", role: "postulante", ...payload }),
  }) as unknown as JwtService;

const makeResolver = (execute = vi.fn().mockResolvedValue(arbolCon("branch.create"))) => ({ execute }) as unknown as ResolverPermisosUseCase;

describe("IniciarSesionUseCase", () => {
  it("signs a token for the Usuario and returns it", async () => {
    const jwtService = makeJwtService();
    const sesiones = makeSesionRepository({ crear: vi.fn().mockResolvedValue(makeSesion()) });
    const useCase = new IniciarSesionUseCase(sesiones, jwtService, makeResolver(), new ContextosSesionStore(), makeLogger());

    const token = await useCase.execute("u1", "postulante");

    expect(jwtService.sign).toHaveBeenCalledExactlyOnceWith({ sub: "u1", role: "postulante" });
    expect(token).toBe(TOKEN);
  });

  it("persists the Sesion with the hash of the token, never the token, expiring when the token does", async () => {
    const sesiones = makeSesionRepository({ crear: vi.fn().mockResolvedValue(makeSesion()) });
    const useCase = new IniciarSesionUseCase(sesiones, makeJwtService(), makeResolver(), new ContextosSesionStore(), makeLogger());

    await useCase.execute("u1", "postulante");

    expect(sesiones.crear).toHaveBeenCalledExactlyOnceWith({
      usuarioId: "u1",
      tokenJWT: hashToken(TOKEN),
      fechaEmision: expect.any(Date),
      fechaExpiracion: new Date(EXP * 1000),
    });
    expect(JSON.stringify(vi.mocked(sesiones.crear).mock.calls)).not.toContain(TOKEN);
  });

  it("initializes the Sesion's ContextoSeguridad from the Usuario's resolved permissions and keeps it for the Sesion", async () => {
    const sesion = makeSesion({ id: "s1" });
    const resolver = makeResolver();
    const contextos = new ContextosSesionStore();
    const useCase = new IniciarSesionUseCase(makeSesionRepository({ crear: vi.fn().mockResolvedValue(sesion) }), makeJwtService(), resolver, contextos, makeLogger());

    await useCase.execute("u1", "postulante");

    expect(resolver.execute).toHaveBeenCalledExactlyOnceWith("u1");
    expect(sesion.contextoSeguridad?.tienePermiso("branch.create")).toBe(true);
    expect(contextos.obtener("s1")).toBe(sesion.contextoSeguridad);
  });

  it("resolves the permissions once per Sesion, however many times its context is read afterwards", async () => {
    const resolver = makeResolver();
    const contextos = new ContextosSesionStore();
    const useCase = new IniciarSesionUseCase(
      makeSesionRepository({ crear: vi.fn().mockResolvedValue(makeSesion({ id: "s1" })) }),
      makeJwtService(),
      resolver,
      contextos,
      makeLogger(),
    );

    await useCase.execute("u1", "postulante");
    contextos.obtener("s1");
    contextos.obtener("s1");

    expect(resolver.execute).toHaveBeenCalledTimes(1);
  });

  it("creates no Sesion when the permissions cannot be resolved", async () => {
    const sesiones = makeSesionRepository({ crear: vi.fn() });
    const resolver = makeResolver(vi.fn().mockRejectedValue(new Error("db down")));
    const contextos = new ContextosSesionStore();
    const useCase = new IniciarSesionUseCase(sesiones, makeJwtService(), resolver, contextos, makeLogger());

    await expect(useCase.execute("u1", "postulante")).rejects.toThrow("db down");
    expect(sesiones.crear).not.toHaveBeenCalled();
  });

  it("stores no context when the Sesion cannot be persisted", async () => {
    const contextos = new ContextosSesionStore();
    const sesiones = makeSesionRepository({ crear: vi.fn().mockRejectedValue(new Error("unique violation")) });
    const useCase = new IniciarSesionUseCase(sesiones, makeJwtService(), makeResolver(), contextos, makeLogger());

    await expect(useCase.execute("u1", "postulante")).rejects.toThrow("unique violation");
    expect(contextos.obtener("s1")).toBeUndefined();
  });

  it("refuses a token that carries no expiry, creating nothing", async () => {
    const sesiones = makeSesionRepository({ crear: vi.fn() });
    const useCase = new IniciarSesionUseCase(sesiones, makeJwtService({}), makeResolver(), new ContextosSesionStore(), makeLogger());

    await expect(useCase.execute("u1", "postulante")).rejects.toThrow("no expiry");
    expect(sesiones.crear).not.toHaveBeenCalled();
  });

  it("never logs the token", async () => {
    const logger = makeLogger();
    const useCase = new IniciarSesionUseCase(
      makeSesionRepository({ crear: vi.fn().mockResolvedValue(makeSesion()) }),
      makeJwtService(),
      makeResolver(),
      new ContextosSesionStore(),
      logger,
    );

    await useCase.execute("u1", "postulante");

    const logged = [logger.debug, logger.log, logger.warn, logger.error].flatMap((fn) => vi.mocked(fn).mock.calls).flat();

    expect(logged.length).toBeGreaterThan(0);
    expect(JSON.stringify(logged)).not.toContain(TOKEN);
  });
});
