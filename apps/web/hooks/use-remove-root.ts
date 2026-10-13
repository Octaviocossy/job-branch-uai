import { useMutation, useQueryClient } from "@tanstack/react-query";
import { security_service } from "@/services/security.service";

interface RemoveRootVariables {
  personaId: string;
  componenteId: string;
}

export const useRemoveRoot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ personaId, componenteId }: RemoveRootVariables) => security_service.removeRoot(personaId, componenteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security", "personas"] });
      queryClient.invalidateQueries({ queryKey: ["security", "groups"] });
    },
  });
};
