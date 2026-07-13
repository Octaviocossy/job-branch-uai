import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateCvVersionRequest } from "@/models";
import { cv_versions_service } from "@/services/cv-versions.service";

export const useCreateCvVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCvVersionRequest) => cv_versions_service.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cv-versions"] });
    },
  });
};
