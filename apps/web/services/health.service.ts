import type { TResult } from "@/models";
import { api } from "@/utilities/api.utility";

export const health_service = {
  get: (signal?: AbortSignal): Promise<TResult<{ status: string }>> => api.get<{ status: string }>("/health", undefined, signal),
};
