import { useMutation } from "@tanstack/react-query";
import { auth_service } from "@/services/auth.service";

export const useLogout = () =>
  useMutation({
    mutationFn: () => auth_service.logout(),
  });
