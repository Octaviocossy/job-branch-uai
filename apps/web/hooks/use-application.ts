import { useQuery } from "@tanstack/react-query";
import { applications_service } from "@/services/applications.service";

export const useApplication = (id: string) =>
  useQuery({
    queryKey: ["applications", id],
    queryFn: ({ signal }) => applications_service.getById(id, signal),
  });
