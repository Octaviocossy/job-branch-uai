import type { FollowupListResponse, Recordatorio, TResult } from "@/models";
import { api } from "@/utilities/api.utility";

export const followup_service = {
  list: (threshold?: number, signal?: AbortSignal): Promise<TResult<FollowupListResponse>> =>
    api.get<FollowupListResponse>("/followup", threshold !== undefined ? { threshold } : undefined, signal),

  markDone: (ramaId: string): Promise<TResult<Recordatorio>> => api.post<undefined, Recordatorio>(`/followup/${ramaId}/done`, undefined),
};
