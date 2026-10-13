import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeLogger } from "../../../../../test/setup/doubles";
import { arbolCon, makeSesion, makeSesionRepository } from "../../../../../test/setup/sesion-doubles";
import { hashToken } from "../../../../shared/auth/token-hash";
import { ContextoSeguridad } from "../../../security/domain/contexto-seguridad";
import { ContextosSesionStore } from "../contextos-sesion.store";
import { ValidarSesionUseCase } from "./validar-sesion.use-case";

const NOW = new Date("2026-10-13T10:30:00Z");
const TOKEN = "header.payload.signature";

describe("ValidarSesionUseCase", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("looks the Sesion up by the hash of the token and returns it with the context it initialized", async () => {
    const sesion = makeSesion({ id: "s1" });
    const contexto = new ContextoSeguridad(arbolCon("branch.create"));
    const contextos = new ContextosSesionStore();
    contextos.guardar("s1", contexto, sesion.fechaExpiracion);
    const sesiones = makeSesionRepository({ buscarPorToken: vi.fn().mockResolvedValue(sesion) });
    const useCase = new ValidarSesionUseCase(sesiones, contextos, makeLogger());

    const vigente = await useCase.execute(TOKEN);

    expect(sesiones.buscarPorToken).toHaveBeenCalledExactlyOnceWith(hashToken(TOKEN));
    expect(vigente?.sesionId).toBe("s1");
    expect(vigente?.contexto).toBe(contexto);
  });

  it("returns the same context on every request of a Sesion, never resolving permissions again", async () => {
    const sesion = makeSesion({ id: "s1" });
    const contexto = new ContextoSeguridad(arbolCon("branch.create"));
    const contextos = new ContextosSesionStore();
    contextos.guardar("s1", contexto, sesion.fechaExpiracion);
    const useCase = new ValidarSesionUseCase(makeSesionRepository({ buscarPorToken: vi.fn().mockResolvedValue(sesion) }), contextos, makeLogger());

    const first = await useCase.execute(TOKEN);
    const second = await useCase.execute(TOKEN);

    expect(second?.contexto).toBe(first?.contexto);
  });

  it("returns null for a token that names no Sesion", async () => {
    const sesiones = makeSesionRepository({ buscarPorToken: vi.fn().mockResolvedValue(null) });
    const useCase = new ValidarSesionUseCase(sesiones, new ContextosSesionStore(), makeLogger());

    await expect(useCase.execute(TOKEN)).resolves.toBeNull();
    expect(sesiones.guardar).not.toHaveBeenCalled();
  });

  it("returns null for a Sesion that has expired, and does not touch it", async () => {
    const sesion = makeSesion({ fechaEmision: new Date("2026-10-13T08:00:00Z"), fechaExpiracion: new Date("2026-10-13T09:00:00Z") });
    const sesiones = makeSesionRepository({ buscarPorToken: vi.fn().mockResolvedValue(sesion) });
    const useCase = new ValidarSesionUseCase(sesiones, new ContextosSesionStore(), makeLogger());

    await expect(useCase.execute(TOKEN)).resolves.toBeNull();
    expect(sesion.fechaExpiracion).toEqual(new Date("2026-10-13T09:00:00Z"));
    expect(sesiones.guardar).not.toHaveBeenCalled();
  });

  it("returns null for a Sesion that logout closed", async () => {
    const sesion = makeSesion({ fechaEmision: new Date("2026-10-13T10:00:00Z"), fechaExpiracion: new Date("2026-10-13T11:00:00Z") });
    sesion.cerrar(new Date("2026-10-13T10:10:00Z"));
    const contextos = new ContextosSesionStore();
    contextos.guardar(sesion.id, new ContextoSeguridad(arbolCon("branch.create")), new Date("2026-10-13T11:00:00Z"));
    const useCase = new ValidarSesionUseCase(makeSesionRepository({ buscarPorToken: vi.fn().mockResolvedValue(sesion) }), contextos, makeLogger());

    await expect(useCase.execute(TOKEN)).resolves.toBeNull();
  });

  it("ends a live Sesion whose context this process does not hold instead of resolving it again", async () => {
    const sesion = makeSesion({ id: "s1", fechaEmision: new Date("2026-10-13T10:00:00Z"), fechaExpiracion: new Date("2026-10-13T11:00:00Z") });
    const sesiones = makeSesionRepository({ buscarPorToken: vi.fn().mockResolvedValue(sesion) });
    const useCase = new ValidarSesionUseCase(sesiones, new ContextosSesionStore(), makeLogger());

    await expect(useCase.execute(TOKEN)).resolves.toBeNull();

    expect(sesion.estaVigente()).toBe(false);
    expect(sesion.fechaExpiracion).toEqual(NOW);
    expect(sesiones.guardar).toHaveBeenCalledExactlyOnceWith(sesion);
  });

  it("never logs the token", async () => {
    const logger = makeLogger();
    const sesion = makeSesion({ id: "s1" });
    const useCase = new ValidarSesionUseCase(makeSesionRepository({ buscarPorToken: vi.fn().mockResolvedValue(sesion) }), new ContextosSesionStore(), logger);

    await useCase.execute(TOKEN);

    expect(JSON.stringify([logger.debug, logger.log, logger.warn, logger.error].flatMap((fn) => vi.mocked(fn).mock.calls))).not.toContain(TOKEN);
  });
});
