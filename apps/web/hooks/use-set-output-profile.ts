import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cv_versions_service } from "@/services/cv-versions.service";

export const useSetOutputProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cv_versions_service.setOutputProfile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cv-versions"] });
    },
  });
};
