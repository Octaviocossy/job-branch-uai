import type { AsignarRaizInput, CatalogoMatriz, CreateGrupoPermisosInput, GrupoPermisos, PersonaRaices, TResult, UpdateGrupoPermisosInput } from "@/models";
import { api } from "@/utilities/api.utility";

export const security_service = {
  catalog: (signal?: AbortSignal): Promise<TResult<CatalogoMatriz>> => api.get<CatalogoMatriz>("/security/catalog", undefined, signal),

  groups: (signal?: AbortSignal): Promise<TResult<GrupoPermisos[]>> => api.get<GrupoPermisos[]>("/security/groups", undefined, signal),

  createGroup: (input: CreateGrupoPermisosInput): Promise<TResult<GrupoPermisos>> => api.post<CreateGrupoPermisosInput, GrupoPermisos>("/security/groups", input),

  updateGroup: (id: string, input: UpdateGrupoPermisosInput): Promise<TResult<GrupoPermisos>> =>
    api.patch<UpdateGrupoPermisosInput, GrupoPermisos>(`/security/groups/${id}`, input),

  deleteGroup: (id: string): Promise<TResult<void>> => api.delete<void>(`/security/groups/${id}`),

  personas: (signal?: AbortSignal): Promise<TResult<PersonaRaices[]>> => api.get<PersonaRaices[]>("/security/personas", undefined, signal),

  assignRoot: (personaId: string, componenteId: string): Promise<TResult<void>> => api.post<AsignarRaizInput, void>(`/security/personas/${personaId}/roots`, { componenteId }),

  removeRoot: (personaId: string, componenteId: string): Promise<TResult<void>> => api.delete<void>(`/security/personas/${personaId}/roots/${componenteId}`),
};
