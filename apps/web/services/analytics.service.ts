import type { AnalyticsOverview, TResult } from "@/models";
import { api } from "@/utilities/api.utility";

export const analytics_service = {
  overview: (signal?: AbortSignal): Promise<TResult<AnalyticsOverview>> => api.get<AnalyticsOverview>("/analytics/overview", undefined, signal),
};
