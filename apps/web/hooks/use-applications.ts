import { useQuery } from "@tanstack/react-query";
import { applications_service } from "@/services/applications.service";

export const useApplications = () =>
  useQuery({
    queryKey: ["applications"],
    queryFn: ({ signal }) => applications_service.list(signal),
  });
