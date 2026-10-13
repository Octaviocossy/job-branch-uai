import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { arbolCon, makeSesion } from "../../../../test/setup/sesion-doubles";

const EMISION = new Date("2026-10-13T10:00:00Z");
const EXPIRACION = new Date("2026-10-13T11:00:00Z");

describe("Sesion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(EMISION);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("estaVigente", () => {
    it("is live before its expiry", () => {
      expect(makeSesion({ fechaEmision: EMISION, fechaExpiracion: EXPIRACION }).estaVigente()).toBe(true);
    });

    it("is not live at its expiry or after it", () => {
      const sesion = makeSesion({ fechaEmision: EMISION, fechaExpiracion: EXPIRACION });

      expect(sesion.estaVigente(EXPIRACION)).toBe(false);
      expect(sesion.estaVigente(new Date(EXPIRACION.getTime() + 1))).toBe(false);
    });
  });

  describe("cerrar", () => {
    it("moves the expiry to now and ends the Sesion", () => {
      const sesion = makeSesion({ fechaEmision: EMISION, fechaExpiracion: EXPIRACION });
      const ahora = new Date("2026-10-13T10:30:00Z");

      sesion.cerrar(ahora);

      expect(sesion.fechaExpiracion).toEqual(ahora);
      expect(sesion.estaVigente(ahora)).toBe(false);
    });

    it("closes against the clock when no moment is given", () => {
      const sesion = makeSesion({ fechaEmision: EMISION, fechaExpiracion: EXPIRACION });

      sesion.cerrar();

      expect(sesion.fechaExpiracion).toEqual(EMISION);
      expect(sesion.estaVigente()).toBe(false);
    });

    it("never extends the expiry of a Sesion that already ended", () => {
      const sesion = makeSesion({ fechaEmision: EMISION, fechaExpiracion: EXPIRACION });

      sesion.cerrar(new Date("2026-10-13T10:30:00Z"));
      sesion.cerrar(new Date("2026-10-13T10:45:00Z"));

      expect(sesion.fechaExpiracion).toEqual(new Date("2026-10-13T10:30:00Z"));
    });

    it("leaves an already expired Sesion at its own expiry", () => {
      const sesion = makeSesion({ fechaEmision: EMISION, fechaExpiracion: EXPIRACION });

      sesion.cerrar(new Date("2026-10-13T12:00:00Z"));

      expect(sesion.fechaExpiracion).toEqual(EXPIRACION);
    });
  });

  describe("inicializarContextoSeguridad", () => {
    it("has no context until it is initialized", () => {
      expect(makeSesion().contextoSeguridad).toBeNull();
    });

    it("builds its ContextoSeguridad from the resolved permissions", () => {
      const sesion = makeSesion();

      const contexto = sesion.inicializarContextoSeguridad(arbolCon("branch.create"));

      expect(sesion.contextoSeguridad).toBe(contexto);
      expect(contexto.tienePermiso("branch.create")).toBe(true);
      expect(contexto.tienePermiso("security.createGroup")).toBe(false);
    });

    it("refuses a second initialization, so permissions are never re-resolved mid-Sesion", () => {
      const sesion = makeSesion();
      const contexto = sesion.inicializarContextoSeguridad(arbolCon("branch.create"));

      expect(() => sesion.inicializarContextoSeguridad(arbolCon("security.createGroup"))).toThrow("already initialized");
      expect(sesion.contextoSeguridad).toBe(contexto);
      expect(sesion.contextoSeguridad?.tienePermiso("security.createGroup")).toBe(false);
    });
  });
});
