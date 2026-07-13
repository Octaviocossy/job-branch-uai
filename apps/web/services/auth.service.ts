import type { AuthResponse, LoginInput, MeResponse, RegisterInput, TResult } from "@/models";
import { api } from "@/utilities/api.utility";

export const auth_service = {
  register: (input: RegisterInput): Promise<TResult<AuthResponse>> => api.post<RegisterInput, AuthResponse>("/auth/register", input),

  login: (input: LoginInput): Promise<TResult<AuthResponse>> => api.post<LoginInput, AuthResponse>("/auth/login", input),

  me: (signal?: AbortSignal): Promise<TResult<MeResponse>> => api.get<MeResponse>("/auth/me", undefined, signal),
};
