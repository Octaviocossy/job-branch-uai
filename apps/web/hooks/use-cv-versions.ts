import { useQuery } from "@tanstack/react-query";
import { cv_versions_service } from "@/services/cv-versions.service";

export const useCvVersions = () =>
  useQuery({
    queryKey: ["cv-versions"],
    queryFn: ({ signal }) => cv_versions_service.list(signal),
  });
