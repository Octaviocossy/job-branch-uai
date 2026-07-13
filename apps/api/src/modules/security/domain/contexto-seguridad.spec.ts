import { describe, expect, it } from "vitest";
import { Accion } from "./accion";
import { ContextoSeguridad } from "./contexto-seguridad";
import { GrupoPermisos } from "./grupo-permisos";

function buildNestedTree(): GrupoPermisos {
  const root = new GrupoPermisos("root", "Root");

  const branchGroup = new GrupoPermisos("branch", "Gestión de Ramas");
  branchGroup.agregarHijo(new Accion("branch.create", "Crear rama", "branch.create"));
  branchGroup.agregarHijo(new Accion("branch.archive", "Archivar rama", "branch.archive"));

  const cvGroup = new GrupoPermisos("cv", "Gestión de CV");
  cvGroup.agregarHijo(new Accion("cv.create", "Crear CV", "cv.create"));

  root.agregarHijo(branchGroup);
  root.agregarHijo(cvGroup);

  return root;
}

describe("ContextoSeguridad", () => {
  it("grants permission for an action nested anywhere in the composite tree", () => {
    const contexto = new ContextoSeguridad(buildNestedTree());

    expect(contexto.tienePermiso("branch.create")).toBe(true);
    expect(contexto.tienePermiso("branch.archive")).toBe(true);
    expect(contexto.tienePermiso("cv.create")).toBe(true);
  });

  it("denies permission for an action absent from the tree", () => {
    const contexto = new ContextoSeguridad(buildNestedTree());

    expect(contexto.tienePermiso("board.view")).toBe(false);
  });

  it("flattens every leaf action via listarAcciones", () => {
    const contexto = new ContextoSeguridad(buildNestedTree());

    expect(contexto.listarAcciones().sort()).toEqual(["branch.archive", "branch.create", "cv.create"]);
  });

  it("reflects a swapped root after cargarMatriz", () => {
    const contexto = new ContextoSeguridad(buildNestedTree());
    const replacement = new GrupoPermisos("replacement", "Replacement");
    replacement.agregarHijo(new Accion("board.view", "Ver tablero", "board.view"));

    contexto.cargarMatriz(replacement);

    expect(contexto.tienePermiso("branch.create")).toBe(false);
    expect(contexto.tienePermiso("board.view")).toBe(true);
  });
});

describe("GrupoPermisos", () => {
  it("evaluar returns false for an empty group (no child grants)", () => {
    const grupo = new GrupoPermisos("empty", "Empty");

    expect(grupo.evaluar("anything")).toBe(false);
  });

  it("obtenerHijos returns the added children", () => {
    const grupo = new GrupoPermisos("group", "Group");
    const accion = new Accion("a", "A", "a");
    grupo.agregarHijo(accion);

    expect(grupo.obtenerHijos()).toEqual([accion]);
  });
});

describe("Accion", () => {
  it("evaluar matches only its own codigoAccion", () => {
    const accion = new Accion("branch.create", "Crear rama", "branch.create");

    expect(accion.evaluar("branch.create")).toBe(true);
    expect(accion.evaluar("branch.archive")).toBe(false);
  });

  it("obtenerHijos is always empty", () => {
    const accion = new Accion("a", "A", "a");

    expect(accion.obtenerHijos()).toEqual([]);
  });

  it("agregarHijo throws — a leaf cannot have children", () => {
    const accion = new Accion("a", "A", "a");

    expect(() => accion.agregarHijo(new Accion("b", "B", "b"))).toThrow();
  });
});
