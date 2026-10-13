import { useMutation, useQueryClient } from "@tanstack/react-query";
import { security_service } from "@/services/security.service";

interface AssignRootVariables {
  personaId: string;
  componenteId: string;
}

export const useAssignRoot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ personaId, componenteId }: AssignRootVariables) => security_service.assignRoot(personaId, componenteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security", "personas"] });
      queryClient.invalidateQueries({ queryKey: ["security", "groups"] });
    },
  });
};
