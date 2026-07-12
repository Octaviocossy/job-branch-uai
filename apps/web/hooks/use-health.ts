import { useQuery } from "@tanstack/react-query";
import { health_service } from "@/services/health.service";

export const useHealth = () =>
  useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => health_service.get(signal),
  });
