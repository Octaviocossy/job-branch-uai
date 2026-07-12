import { useQuery } from "@tanstack/react-query";
import { users_service } from "@/services/users.service";

export const useUsers = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: ({ signal }) => users_service.list(signal),
  });
