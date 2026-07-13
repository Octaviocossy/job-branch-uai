import { useQuery } from "@tanstack/react-query";
import { analytics_service } from "@/services/analytics.service";

export const useAnalytics = () =>
  useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: ({ signal }) => analytics_service.overview(signal),
  });
