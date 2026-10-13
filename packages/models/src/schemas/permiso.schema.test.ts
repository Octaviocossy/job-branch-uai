import { describe, expect, it } from "vitest";
import {
  asignarRaizSchema,
  catalogoMatrizSchema,
  createGrupoPermisosSchema,
  grupoPermisosSchema,
  permissionMatrixSchema,
  personaRaicesSchema,
  updateGrupoPermisosSchema,
} from "./permiso.schema";

const id = "0d8b0f29-0611-43fe-8f49-434c0ce4dcc9";
const otherId = "83119203-88f1-479c-8c36-dbbb51d3aa4a";

describe("permissionMatrixSchema", () => {
  const valid = {
    role: "postulante",
    modulos: [{ id, nombre: "Pipeline", formularios: [{ id: otherId, nombre: "Tablero", acciones: [{ id, codigoAccion: "branch.list", nombre: "Listar ramas" }] }] }],
  };

  it("parses a valid permission matrix unchanged", () => {
    expect(permissionMatrixSchema.parse(valid)).toEqual(valid);
  });

  it("accepts an empty modulos array", () => {
    expect(permissionMatrixSchema.safeParse({ ...valid, modulos: [] }).success).toBe(true);
  });

  it("accepts administrador as a role", () => {
    expect(permissionMatrixSchema.safeParse({ ...valid, role: "administrador" }).success).toBe(true);
  });

  it("rejects a role outside postulante/recruiter/administrador", () => {
    const result = permissionMatrixSchema.safeParse({ ...valid, role: "admin" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("role");
    }
  });

  it("rejects the former flat acciones shape", () => {
    expect(permissionMatrixSchema.safeParse({ role: "postulante", acciones: ["branch.list"] }).success).toBe(false);
  });

  it("rejects an Accion with an empty codigoAccion", () => {
    const modulos = [{ id, nombre: "Pipeline", formularios: [{ id: otherId, nombre: "Tablero", acciones: [{ id, codigoAccion: "", nombre: "Listar ramas" }] }] }];

    expect(permissionMatrixSchema.safeParse({ ...valid, modulos }).success).toBe(false);
  });
});

describe("catalogoMatrizSchema", () => {
  const accion = { id, codigoAccion: "branch.list", nombre: "Listar ramas" };

  it("accepts an Accion with the group that holds it, or with none", () => {
    const catalogo = [
      {
        id,
        nombre: "Pipeline",
        formularios: [
          {
            id: otherId,
            nombre: "Tablero",
            acciones: [
              { ...accion, grupo: { id: otherId, nombre: "Tablero" } },
              { ...accion, grupo: null },
            ],
          },
        ],
      },
    ];

    expect(catalogoMatrizSchema.parse(catalogo)).toEqual(catalogo);
  });

  it("rejects an Accion without a grupo key", () => {
    const catalogo = [{ id, nombre: "Pipeline", formularios: [{ id: otherId, nombre: "Tablero", acciones: [accion] }] }];

    expect(catalogoMatrizSchema.safeParse(catalogo).success).toBe(false);
  });
});

describe("grupoPermisosSchema", () => {
  const valid = {
    id,
    nombre: "Pipeline",
    descripcion: null,
    padreId: null,
    hijos: [{ id: otherId, tipo: "accion", nombre: "Listar ramas", codigoAccion: "branch.list" }],
    personasConRaiz: 2,
  };

  it("parses a valid group unchanged", () => {
    expect(grupoPermisosSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a negative personasConRaiz", () => {
    expect(grupoPermisosSchema.safeParse({ ...valid, personasConRaiz: -1 }).success).toBe(false);
  });

  it("rejects a child tipo outside grupo/accion", () => {
    expect(grupoPermisosSchema.safeParse({ ...valid, hijos: [{ ...valid.hijos[0], tipo: "modulo" }] }).success).toBe(false);
  });
});

describe("createGrupoPermisosSchema", () => {
  it("defaults hijoIds to an empty list", () => {
    expect(createGrupoPermisosSchema.parse({ nombre: "Nuevo" })).toEqual({ nombre: "Nuevo", hijoIds: [] });
  });

  it("accepts a parent, a description and children", () => {
    const input = { nombre: "Nuevo", descripcion: "Texto", padreId: id, hijoIds: [otherId] };

    expect(createGrupoPermisosSchema.parse(input)).toEqual(input);
  });

  it("accepts a null description and a null parent", () => {
    expect(createGrupoPermisosSchema.safeParse({ nombre: "Nuevo", descripcion: null, padreId: null }).success).toBe(true);
  });

  it("rejects an empty nombre", () => {
    expect(createGrupoPermisosSchema.safeParse({ nombre: "" }).success).toBe(false);
  });

  it("rejects a hijoIds entry that is not a uuid", () => {
    expect(createGrupoPermisosSchema.safeParse({ nombre: "Nuevo", hijoIds: ["not-a-uuid"] }).success).toBe(false);
  });
});

describe("updateGrupoPermisosSchema", () => {
  it("leaves hijoIds absent when the body does not carry it", () => {
    const parsed = updateGrupoPermisosSchema.parse({ nombre: "Renombrado" });

    expect(parsed).toEqual({ nombre: "Renombrado" });
    expect(parsed.hijoIds).toBeUndefined();
  });

  it("accepts an empty body", () => {
    expect(updateGrupoPermisosSchema.parse({})).toEqual({});
  });

  it("keeps an explicit empty hijoIds, which empties the group", () => {
    expect(updateGrupoPermisosSchema.parse({ hijoIds: [] })).toEqual({ hijoIds: [] });
  });

  it("rejects an empty nombre", () => {
    expect(updateGrupoPermisosSchema.safeParse({ nombre: "" }).success).toBe(false);
  });

  it("rejects a hijoIds entry that is not a uuid", () => {
    expect(updateGrupoPermisosSchema.safeParse({ hijoIds: ["not-a-uuid"] }).success).toBe(false);
  });
});

describe("personaRaicesSchema", () => {
  const valid = {
    personaId: id,
    tipo: "postulante",
    usuario: { id: otherId, email: "a@example.com", nombreCompleto: "A" },
    raices: [{ id, nombre: "Pipeline", tipo: "grupo" }],
  };

  it("parses a valid Persona with its roots unchanged", () => {
    expect(personaRaicesSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an invalid email", () => {
    expect(personaRaicesSchema.safeParse({ ...valid, usuario: { ...valid.usuario, email: "nope" } }).success).toBe(false);
  });
});

describe("asignarRaizSchema", () => {
  it("accepts a componenteId uuid", () => {
    expect(asignarRaizSchema.parse({ componenteId: id })).toEqual({ componenteId: id });
  });

  it("rejects a componenteId that is not a uuid", () => {
    expect(asignarRaizSchema.safeParse({ componenteId: "x" }).success).toBe(false);
  });
});
