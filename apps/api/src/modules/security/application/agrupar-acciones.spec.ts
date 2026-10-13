import { describe, expect, it } from "vitest";
import type { AccionFila, CatalogoFilas } from "../domain/componente-permiso.repository";
import { agruparAcciones } from "./agrupar-acciones";

const accion = (id: string, codigoAccion: string, nombre: string, formularioId: string, padreId: string | null = null): AccionFila => ({
  id,
  codigoAccion,
  nombre,
  formularioId,
  padreId,
  padreNombre: padreId === null ? null : `grupo-${padreId}`,
});

const catalogo: CatalogoFilas = {
  modulos: [
    { id: "m-pipeline", nombre: "Pipeline" },
    { id: "m-cuenta", nombre: "Cuenta" },
    { id: "m-vacio", nombre: "Vacío" },
  ],
  formularios: [
    { id: "f-tablero", nombre: "Tablero", moduloId: "m-pipeline" },
    { id: "f-detalle", nombre: "Detalle de rama", moduloId: "m-pipeline" },
    { id: "f-sesion", nombre: "Sesión", moduloId: "m-cuenta" },
    { id: "f-sin-acciones", nombre: "Sin acciones", moduloId: "m-cuenta" },
  ],
  acciones: [
    accion("a-view", "branch.view", "Ver rama", "f-detalle", "g1"),
    accion("a-list", "branch.list", "Listar ramas", "f-tablero", "g2"),
    accion("a-me", "auth.me", "Ver perfil propio", "f-sesion"),
    accion("a-archive", "branch.archive", "Archivar rama", "f-detalle"),
  ],
};

describe("agruparAcciones", () => {
  it("groups the Acciones by Modulo then Formulario, each level sorted by name", () => {
    const resultado = agruparAcciones(catalogo, ({ codigoAccion }) => codigoAccion);

    expect(resultado.map((modulo) => modulo.nombre)).toEqual(["Cuenta", "Pipeline", "Vacío"]);
    expect(resultado[1]?.formularios).toEqual([
      { id: "f-detalle", nombre: "Detalle de rama", acciones: ["branch.archive", "branch.view"] },
      { id: "f-tablero", nombre: "Tablero", acciones: ["branch.list"] },
    ]);
    expect(resultado[0]?.formularios.map((formulario) => formulario.nombre)).toEqual(["Sesión", "Sin acciones"]);
  });

  it("keeps the empty Formularios and Modulos by default", () => {
    const resultado = agruparAcciones(catalogo, ({ id }) => id);

    expect(resultado.find((modulo) => modulo.id === "m-vacio")?.formularios).toEqual([]);
    expect(resultado.find((modulo) => modulo.id === "m-cuenta")?.formularios.find((formulario) => formulario.id === "f-sin-acciones")?.acciones).toEqual([]);
  });

  it("drops the empty Formularios and Modulos when asked to", () => {
    const resultado = agruparAcciones(catalogo, ({ id }) => id, { omitirVacios: true });

    expect(resultado.map((modulo) => modulo.nombre)).toEqual(["Cuenta", "Pipeline"]);
    expect(resultado[0]?.formularios.map((formulario) => formulario.nombre)).toEqual(["Sesión"]);
  });

  it("returns what the mapper builds for each Accion", () => {
    const resultado = agruparAcciones(catalogo, ({ id, padreId, padreNombre }) => ({ id, grupo: padreId === null ? null : { id: padreId, nombre: padreNombre } }));

    expect(resultado[1]?.formularios[1]?.acciones).toEqual([{ id: "a-list", grupo: { id: "g2", nombre: "grupo-g2" } }]);
    expect(resultado[0]?.formularios[0]?.acciones).toEqual([{ id: "a-me", grupo: null }]);
  });

  it("returns nothing for an empty catalog", () => {
    expect(agruparAcciones({ modulos: [], formularios: [], acciones: [] }, ({ id }) => id)).toEqual([]);
  });

  it("ignores an Accion whose Formulario is unknown", () => {
    const resultado = agruparAcciones({ ...catalogo, acciones: [accion("a-x", "x.y", "X", "f-desconocido")] }, ({ id }) => id, { omitirVacios: true });

    expect(resultado).toEqual([]);
  });
});
