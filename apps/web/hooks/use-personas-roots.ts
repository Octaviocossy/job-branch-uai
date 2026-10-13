import { useQuery } from "@tanstack/react-query";
import { security_service } from "@/services/security.service";

export const usePersonasRoots = () =>
  useQuery({
    queryKey: ["security", "personas"],
    queryFn: ({ signal }) => security_service.personas(signal),
  });
