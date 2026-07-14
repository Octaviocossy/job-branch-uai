import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateBranchDependentQueries } from "@/query/branch-dependent-keys";
import { applications_service } from "@/services/applications.service";

export const useArchiveApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => applications_service.archive(id),
    onSuccess: () => {
      invalidateBranchDependentQueries(queryClient);
    },
  });
};
