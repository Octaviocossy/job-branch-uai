import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeLogger } from "../../../../../test/setup/doubles";
import { arbolCon, makeSesion, makeSesionRepository } from "../../../../../test/setup/sesion-doubles";
import { ContextoSeguridad } from "../../../security/domain/contexto-seguridad";
import { ContextosSesionStore } from "../contextos-sesion.store";
import { CerrarSesionUseCase } from "./cerrar-sesion.use-case";

const NOW = new Date("2026-10-13T10:30:00Z");

describe("CerrarSesionUseCase", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("moves the Sesion's expiry to now and persists it", async () => {
    const sesion = makeSesion({ id: "s1", fechaEmision: new Date("2026-10-13T10:00:00Z"), fechaExpiracion: new Date("2026-10-13T11:00:00Z") });
    const sesiones = makeSesionRepository({ buscarPorId: vi.fn().mockResolvedValue(sesion) });
    const useCase = new CerrarSesionUseCase(sesiones, new ContextosSesionStore(), makeLogger());

    await useCase.execute("s1");

    expect(sesiones.buscarPorId).toHaveBeenCalledExactlyOnceWith("s1");
    expect(sesion.fechaExpiracion).toEqual(NOW);
    expect(sesion.estaVigente()).toBe(false);
    expect(sesiones.guardar).toHaveBeenCalledExactlyOnceWith(sesion);
  });

  it("forgets the context the Sesion initialized", async () => {
    const contextos = new ContextosSesionStore();
    contextos.guardar("s1", new ContextoSeguridad(arbolCon("branch.create")), new Date("2026-10-13T11:00:00Z"));
    const sesiones = makeSesionRepository({ buscarPorId: vi.fn().mockResolvedValue(makeSesion({ id: "s1" })) });
    const useCase = new CerrarSesionUseCase(sesiones, contextos, makeLogger());

    await useCase.execute("s1");

    expect(contextos.obtener("s1")).toBeUndefined();
  });

  it("is idempotent: closing a closed Sesion keeps its first expiry", async () => {
    const sesion = makeSesion({ id: "s1", fechaEmision: new Date("2026-10-13T10:00:00Z"), fechaExpiracion: new Date("2026-10-13T11:00:00Z") });
    const useCase = new CerrarSesionUseCase(makeSesionRepository({ buscarPorId: vi.fn().mockResolvedValue(sesion) }), new ContextosSesionStore(), makeLogger());

    await useCase.execute("s1");
    vi.setSystemTime(new Date("2026-10-13T10:45:00Z"));
    await useCase.execute("s1");

    expect(sesion.fechaExpiracion).toEqual(NOW);
  });

  it("does nothing, and does not fail, for a Sesion that does not exist", async () => {
    const sesiones = makeSesionRepository({ buscarPorId: vi.fn().mockResolvedValue(null) });
    const useCase = new CerrarSesionUseCase(sesiones, new ContextosSesionStore(), makeLogger());

    await expect(useCase.execute("missing")).resolves.toBeUndefined();
    expect(sesiones.guardar).not.toHaveBeenCalled();
  });
});
