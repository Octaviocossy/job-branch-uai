import type { Application, CreateApplicationInput, CreateHitoInput, TResult } from "@/models";
import { api } from "@/utilities/api.utility";

export const applications_service = {
  list: (signal?: AbortSignal): Promise<TResult<Application[]>> => api.get<Application[]>("/branches", undefined, signal),

  getById: (id: string, signal?: AbortSignal): Promise<TResult<Application>> => api.get<Application>(`/branches/${id}`, undefined, signal),

  create: (input: CreateApplicationInput): Promise<TResult<Application>> => api.post<CreateApplicationInput, Application>("/branches", input),

  clone: (id: string): Promise<TResult<Application>> => api.post<undefined, Application>(`/branches/${id}/clone`, undefined),

  archive: (id: string): Promise<TResult<Application>> => api.post<undefined, Application>(`/branches/${id}/archive`, undefined),

  addHito: (id: string, input: CreateHitoInput): Promise<TResult<Application>> => api.post<CreateHitoInput, Application>(`/branches/${id}/hitos`, input),
};
