import { useMutation, useQueryClient } from "@tanstack/react-query";
import { applications_service } from "@/services/applications.service";

export const useCloneApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => applications_service.clone(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
};
