import { useMutation } from "@tanstack/react-query";
import type { RegisterInput } from "@/models";
import { auth_service } from "@/services/auth.service";

export const useRegister = () =>
  useMutation({
    mutationFn: (input: RegisterInput) => auth_service.register(input),
  });
