import { useMutation, useQueryClient } from "@tanstack/react-query";
import { security_service } from "@/services/security.service";

export const useDeletePermissionGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => security_service.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["security", "catalog"] });
      queryClient.invalidateQueries({ queryKey: ["security", "personas"] });
    },
  });
};
