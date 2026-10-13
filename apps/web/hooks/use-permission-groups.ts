import { useQuery } from "@tanstack/react-query";
import { security_service } from "@/services/security.service";

export const usePermissionGroups = () =>
  useQuery({
    queryKey: ["security", "groups"],
    queryFn: ({ signal }) => security_service.groups(signal),
  });
