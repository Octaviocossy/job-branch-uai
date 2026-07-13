import { useMutation, useQueryClient } from "@tanstack/react-query";
import { followup_service } from "@/services/followup.service";

export const useMarkFollowupDone = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ramaId: string) => followup_service.markDone(ramaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["followup"] });
    },
  });
};
