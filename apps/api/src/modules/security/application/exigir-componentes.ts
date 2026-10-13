import type { ComponenteFila, ComponentePermisoRepository } from "../domain/componente-permiso.repository";
import { ComponenteNoEncontradoError, NoEsGrupoError } from "../domain/errors/matriz-permisos.errors";

/** The component with that id, or `ComponenteNoEncontradoError`. */
export async function exigirComponente(repository: ComponentePermisoRepository, id: string): Promise<ComponenteFila> {
  const componente = await repository.buscarComponente(id);

  if (!componente) {
    throw new ComponenteNoEncontradoError(id);
  }

  return componente;
}

/** The component with that id, which must be a GrupoPermisos: `ComponenteNoEncontradoError` or `NoEsGrupoError` otherwise. */
export async function exigirGrupo(repository: ComponentePermisoRepository, id: string): Promise<ComponenteFila> {
  const componente = await exigirComponente(repository, id);

  if (componente.tipo !== "grupo") {
    throw new NoEsGrupoError(id);
  }

  return componente;
}

/** The first of `ids` that is already one of `prohibidos`, if any. */
export function primeroProhibido(ids: readonly string[], prohibidos: ReadonlySet<string>): string | undefined {
  return ids.find((id) => prohibidos.has(id));
}
