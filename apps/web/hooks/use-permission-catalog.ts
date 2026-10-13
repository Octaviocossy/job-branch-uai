import { useQuery } from "@tanstack/react-query";
import { security_service } from "@/services/security.service";

export const usePermissionCatalog = () =>
  useQuery({
    queryKey: ["security", "catalog"],
    queryFn: ({ signal }) => security_service.catalog(signal),
  });
