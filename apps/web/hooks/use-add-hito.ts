import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateHitoInput } from "@/models";
import { applications_service } from "@/services/applications.service";

export const useAddHito = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateHitoInput }) => applications_service.addHito(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
};
