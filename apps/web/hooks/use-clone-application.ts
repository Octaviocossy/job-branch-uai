import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateBranchDependentQueries } from "@/query/branch-dependent-keys";
import { applications_service } from "@/services/applications.service";

export const useCloneApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => applications_service.clone(id),
    onSuccess: () => {
      invalidateBranchDependentQueries(queryClient);
    },
  });
};
