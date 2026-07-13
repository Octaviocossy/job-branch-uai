import { useQuery } from "@tanstack/react-query";
import { followup_service } from "@/services/followup.service";

export const useFollowups = (threshold: number) =>
  useQuery({
    queryKey: ["followup", threshold],
    queryFn: ({ signal }) => followup_service.list(threshold, signal),
  });
