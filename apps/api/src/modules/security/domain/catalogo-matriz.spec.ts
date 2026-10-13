import { describe, expect, it } from "vitest";
import { ACCIONES, FORMULARIOS, GRUPOS, MODULOS } from "./catalogo-matriz";

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("catalogo-matriz", () => {
  const grupos = Object.values(GRUPOS);

  it("holds exactly 29 Acciones, one per protected endpoint", () => {
    expect(ACCIONES).toHaveLength(29);
  });

  it("has unique codes", () => {
    const codigos = ACCIONES.map((accion) => accion.codigoAccion);

    expect(new Set(codigos).size).toBe(codigos.length);
  });

  it("has none of the retired Recruiter board and candidate codes — no endpoint and no CU backs them", () => {
    for (const { codigoAccion } of ACCIONES) {
      expect(codigoAccion).not.toMatch(/^(board|candidate)\./);
    }
  });

  it("points every Accion at an existing Formulario and an existing default group", () => {
    const formularioIds = new Set(FORMULARIOS.map((formulario) => formulario.id));
    const grupoIds = new Set(grupos.map((grupo) => grupo.id));

    for (const accion of ACCIONES) {
      expect(formularioIds.has(accion.formularioId), `${accion.codigoAccion} formulario`).toBe(true);
      expect(grupoIds.has(accion.grupoPorDefecto), `${accion.codigoAccion} grupo`).toBe(true);
    }
  });

  it("points every Formulario at an existing Modulo", () => {
    const moduloIds = new Set(MODULOS.map((modulo) => modulo.id));

    for (const formulario of FORMULARIOS) {
      expect(moduloIds.has(formulario.moduloId), formulario.nombre).toBe(true);
    }
  });

  it("points every group's parent at an existing group, and never at itself", () => {
    const grupoIds = new Set(grupos.map((grupo) => grupo.id));

    for (const grupo of grupos) {
      if (grupo.padreId !== null) {
        expect(grupoIds.has(grupo.padreId), grupo.nombre).toBe(true);
        expect(grupo.padreId).not.toBe(grupo.id);
      }
    }
  });

  it("uses a distinct v4 UUID for every Modulo, Formulario and group", () => {
    const ids = [...MODULOS, ...FORMULARIOS, ...grupos].map((definicion) => definicion.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(UUID_V4);
    }
  });

  it("gives every Modulo a unique nombre — the table enforces it", () => {
    const nombres = MODULOS.map((modulo) => modulo.nombre);

    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it("traces every Accion to a use case", () => {
    for (const accion of ACCIONES) {
      expect(accion.cu, accion.codigoAccion).toMatch(/^CU-\d{2}/);
    }
  });
});
