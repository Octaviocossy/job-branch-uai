import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateGrupoPermisosInput } from "@/models";
import { security_service } from "@/services/security.service";

interface SavePermissionGroupVariables {
  /** The group to update; omitted to create a new one. */
  id?: string;
  input: CreateGrupoPermisosInput;
}

export const useSavePermissionGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: SavePermissionGroupVariables) => (id ? security_service.updateGroup(id, input) : security_service.createGroup(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security", "groups"] });
      queryClient.invalidateQueries({ queryKey: ["security", "catalog"] });
    },
  });
};
