import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cv_versions_service } from "@/services/cv-versions.service";

export const useUploadCv = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => cv_versions_service.uploadFile(id, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cv-versions"] });
    },
  });
};
