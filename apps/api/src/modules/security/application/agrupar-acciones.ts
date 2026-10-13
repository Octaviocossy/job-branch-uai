import type { AccionFila, CatalogoFilas } from "../domain/componente-permiso.repository";

export interface ModuloAgrupado<T> {
  id: string;
  nombre: string;
  formularios: { id: string; nombre: string; acciones: T[] }[];
}

/**
 * Groups Acciones by Modulo, then Formulario, each level sorted by name (decision 21). The catalog endpoint and
 * the caller's own matrix share it, each mapping an Accion to the shape it returns. `omitirVacios` drops the
 * Formularios and Modulos left with no Accion, which the caller's matrix wants once it has filtered by permission.
 */
export function agruparAcciones<T>(catalogo: CatalogoFilas, aAccion: (accion: AccionFila) => T, { omitirVacios = false }: { omitirVacios?: boolean } = {}): ModuloAgrupado<T>[] {
  const accionesPorFormulario = new Map<string, AccionFila[]>();

  for (const accion of [...catalogo.acciones].sort(porNombre)) {
    accionesPorFormulario.set(accion.formularioId, [...(accionesPorFormulario.get(accion.formularioId) ?? []), accion]);
  }

  return [...catalogo.modulos]
    .sort(porNombre)
    .map((modulo) => ({
      id: modulo.id,
      nombre: modulo.nombre,
      formularios: [...catalogo.formularios]
        .filter((formulario) => formulario.moduloId === modulo.id)
        .sort(porNombre)
        .map((formulario) => ({ id: formulario.id, nombre: formulario.nombre, acciones: (accionesPorFormulario.get(formulario.id) ?? []).map(aAccion) }))
        .filter((formulario) => !omitirVacios || formulario.acciones.length > 0),
    }))
    .filter((modulo) => !omitirVacios || modulo.formularios.length > 0);
}

function porNombre(a: { nombre: string; id: string }, b: { nombre: string; id: string }): number {
  return a.nombre.localeCompare(b.nombre, "es") || a.id.localeCompare(b.id);
}
