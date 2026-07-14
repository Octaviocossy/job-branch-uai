import { describe, expect, it } from "vitest";
import { Accion } from "./accion";
import { Formulario } from "./formulario";
import { Modulo } from "./modulo";

describe("Formulario", () => {
  it("obtenerHijos returns the added children", () => {
    const formulario = new Formulario("form.cv", "Formulario CV");
    const accion = new Accion("cv.create", "Crear versión de CV", "cv.create");
    formulario.agregarHijo(accion);

    expect(formulario.obtenerHijos()).toEqual([accion]);
  });

  it("evaluar delegates to its children", () => {
    const formulario = new Formulario("form.cv", "Formulario CV");
    formulario.agregarHijo(new Accion("cv.create", "Crear versión de CV", "cv.create"));

    expect(formulario.evaluar("cv.create")).toBe(true);
    expect(formulario.evaluar("cv.upload")).toBe(false);
  });
});

describe("Modulo", () => {
  it("obtenerHijos returns the added children", () => {
    const modulo = new Modulo("mod.cv", "Módulo CV");
    const formulario = new Formulario("form.cv", "Formulario CV");
    modulo.agregarHijo(formulario);

    expect(modulo.obtenerHijos()).toEqual([formulario]);
  });

  it("resolves a leaf Accion nested two levels deep (Modulo -> Formulario -> Accion)", () => {
    const modulo = new Modulo("mod.cv", "Módulo CV");
    const formulario = new Formulario("form.cv", "Formulario CV");
    formulario.agregarHijo(new Accion("cv.upload", "Subir archivo de CV", "cv.upload"));
    modulo.agregarHijo(formulario);

    expect(modulo.evaluar("cv.upload")).toBe(true);
    expect(modulo.evaluar("cv.setOutput")).toBe(false);
  });
});
