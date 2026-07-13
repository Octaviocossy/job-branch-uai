import { useMutation } from "@tanstack/react-query";
import type { LoginInput } from "@/models";
import { auth_service } from "@/services/auth.service";

export const useLogin = () =>
  useMutation({
    mutationFn: (input: LoginInput) => auth_service.login(input),
  });
