import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { arbolCon } from "../../../../test/setup/sesion-doubles";
import { ContextoSeguridad } from "../../security/domain/contexto-seguridad";
import { ContextosSesionStore } from "./contextos-sesion.store";

const NOW = new Date("2026-10-13T10:00:00Z");
const inAnHour = new Date(NOW.getTime() + 3_600_000);

const contextoCon = (...codigos: string[]) => new ContextoSeguridad(arbolCon(...codigos));

describe("ContextosSesionStore", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the context saved for a Sesion, the very same instance", () => {
    const store = new ContextosSesionStore();
    const contexto = contextoCon("branch.create");

    store.guardar("s1", contexto, inAnHour);

    expect(store.obtener("s1")).toBe(contexto);
  });

  it("returns undefined for a Sesion it holds no context for", () => {
    expect(new ContextosSesionStore().obtener("s1")).toBeUndefined();
  });

  it("keeps the contexts of two Sesiones apart", () => {
    const store = new ContextosSesionStore();
    const first = contextoCon("branch.create");
    const second = contextoCon();

    store.guardar("s1", first, inAnHour);
    store.guardar("s2", second, inAnHour);

    expect(store.obtener("s1")).toBe(first);
    expect(store.obtener("s2")).toBe(second);
  });

  it("forgets a context once eliminated, and eliminating twice is harmless", () => {
    const store = new ContextosSesionStore();
    store.guardar("s1", contextoCon("branch.create"), inAnHour);

    store.eliminar("s1");
    store.eliminar("s1");

    expect(store.obtener("s1")).toBeUndefined();
  });

  it("drops the contexts of expired Sesiones when another one is saved, so memory does not grow with every login", () => {
    const store = new ContextosSesionStore();
    store.guardar("vencida", contextoCon("branch.create"), new Date(NOW.getTime() + 60_000));
    store.guardar("vigente", contextoCon("branch.create"), inAnHour);

    vi.setSystemTime(new Date(NOW.getTime() + 61_000));
    store.guardar("nueva", contextoCon(), new Date(NOW.getTime() + 7_200_000));

    expect(store.obtener("vencida")).toBeUndefined();
    expect(store.obtener("vigente")).toBeDefined();
    expect(store.obtener("nueva")).toBeDefined();
  });
});
