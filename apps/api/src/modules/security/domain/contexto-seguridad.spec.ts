import { describe, expect, it } from "vitest";
import { Accion } from "./accion";
import { ContextoSeguridad } from "./contexto-seguridad";
import { GrupoPermisos } from "./grupo-permisos";

const FORMULARIO_ID = "form-1";

function buildNestedTree(): GrupoPermisos {
  const root = new GrupoPermisos("root", "Root");

  const branchGroup = new GrupoPermisos("branch", "Gestión de Ramas");
  branchGroup.agregar(new Accion("a1", "Crear rama", "branch.create", FORMULARIO_ID));
  branchGroup.agregar(new Accion("a2", "Archivar rama", "branch.archive", FORMULARIO_ID));

  const cvGroup = new GrupoPermisos("cv", "Gestión de CV");
  cvGroup.agregar(new Accion("a3", "Crear CV", "cv.create", FORMULARIO_ID));

  root.agregar(branchGroup);
  root.agregar(cvGroup);

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

    expect(contexto.tienePermiso("security.listGroups")).toBe(false);
  });

  it("flattens every leaf action via listarAcciones", () => {
    const contexto = new ContextoSeguridad(buildNestedTree());

    expect(contexto.listarAcciones().sort()).toEqual(["branch.archive", "branch.create", "cv.create"]);
  });

  it("lists each code once when the same group appears under two roots of a transient wrapper", () => {
    const shared = new GrupoPermisos("cuenta", "Cuenta");
    shared.agregar(new Accion("a1", "Ver perfil propio", "auth.me", FORMULARIO_ID));
    const other = new GrupoPermisos("pipeline", "Pipeline");
    other.agregar(new Accion("a2", "Crear rama", "branch.create", FORMULARIO_ID));
    other.agregar(shared);
    const wrapper = new GrupoPermisos("persona:p1", "Raíces de la Persona");
    wrapper.agregar(shared);
    wrapper.agregar(other);

    const contexto = new ContextoSeguridad(wrapper);

    expect(contexto.listarAcciones().sort()).toEqual(["auth.me", "branch.create"]);
  });

  it("lists nothing for an empty group", () => {
    const contexto = new ContextoSeguridad(new GrupoPermisos("empty", "Empty"));

    expect(contexto.listarAcciones()).toEqual([]);
  });

  it("reflects a swapped root after cargarMatriz", () => {
    const contexto = new ContextoSeguridad(buildNestedTree());
    const replacement = new GrupoPermisos("replacement", "Replacement");
    replacement.agregar(new Accion("a9", "Listar grupos", "security.listGroups", FORMULARIO_ID));

    contexto.cargarMatriz(replacement);

    expect(contexto.tienePermiso("branch.create")).toBe(false);
    expect(contexto.tienePermiso("security.listGroups")).toBe(true);
  });
});

describe("GrupoPermisos", () => {
  it("evaluar returns false for an empty group (no child grants)", () => {
    const grupo = new GrupoPermisos("empty", "Empty");

    expect(grupo.evaluar("anything")).toBe(false);
  });

  it("keeps its descripcion, null by default", () => {
    expect(new GrupoPermisos("g", "G").descripcion).toBeNull();
    expect(new GrupoPermisos("g", "G", "CU-15").descripcion).toBe("CU-15");
  });

  it("obtenerHijos returns the added children", () => {
    const grupo = new GrupoPermisos("group", "Group");
    const accion = new Accion("a", "A", "a", FORMULARIO_ID);
    grupo.agregar(accion);

    expect(grupo.obtenerHijos()).toEqual([accion]);
  });

  it("remover drops the child with the same id and leaves the others", () => {
    const grupo = new GrupoPermisos("group", "Group");
    const keep = new Accion("a", "A", "a", FORMULARIO_ID);
    const drop = new Accion("b", "B", "b", FORMULARIO_ID);
    grupo.agregar(keep);
    grupo.agregar(drop);

    grupo.remover(drop);

    expect(grupo.obtenerHijos()).toEqual([keep]);
    expect(grupo.evaluar("b")).toBe(false);
  });

  it("remover ignores a component that is not a child", () => {
    const grupo = new GrupoPermisos("group", "Group");
    const accion = new Accion("a", "A", "a", FORMULARIO_ID);
    grupo.agregar(accion);

    grupo.remover(new Accion("zzz", "Z", "z", FORMULARIO_ID));

    expect(grupo.obtenerHijos()).toEqual([accion]);
  });
});

describe("Accion", () => {
  it("evaluar matches only its own codigoAccion", () => {
    const accion = new Accion("a1", "Crear rama", "branch.create", FORMULARIO_ID);

    expect(accion.evaluar("branch.create")).toBe(true);
    expect(accion.evaluar("branch.archive")).toBe(false);
  });

  it("obtenerHijos is always empty", () => {
    const accion = new Accion("a", "A", "a", FORMULARIO_ID);

    expect(accion.obtenerHijos()).toEqual([]);
  });

  it("agregar and remover throw — a leaf cannot have children", () => {
    const accion = new Accion("a", "A", "a", FORMULARIO_ID);
    const other = new Accion("b", "B", "b", FORMULARIO_ID);

    expect(() => accion.agregar(other)).toThrow();
    expect(() => accion.remover(other)).toThrow();
  });
});
