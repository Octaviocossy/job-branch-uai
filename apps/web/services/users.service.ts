import type { CreateUserInput, TResult, User } from "@/models";
import { api } from "@/utilities/api.utility";

export const users_service = {
  list: (signal?: AbortSignal): Promise<TResult<User[]>> => api.get<User[]>("/users", undefined, signal),

  create: (input: CreateUserInput): Promise<TResult<User>> => api.post<CreateUserInput, User>("/users", input),
};
