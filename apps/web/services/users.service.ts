import type { TResult, Usuario } from "@/models";
import { api } from "@/utilities/api.utility";

export const users_service = {
  list: (signal?: AbortSignal): Promise<TResult<Usuario[]>> => api.get<Usuario[]>("/users", undefined, signal),
};
