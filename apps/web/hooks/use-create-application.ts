import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateApplicationInput } from "@/models";
import { applications_service } from "@/services/applications.service";

export const useCreateApplication = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateApplicationInput) => applications_service.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
};
