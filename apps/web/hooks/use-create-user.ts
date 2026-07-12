import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { CreateUserInput } from "@/models";
import { users_service } from "@/services/users.service";

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateUserInput) => users_service.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
};
