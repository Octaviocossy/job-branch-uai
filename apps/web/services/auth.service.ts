import type { AuthResponse, LoginInput, RegisterInput, TResult } from "@/models";
import { api } from "@/utilities/api.utility";

export interface AuthSession {
  sub: string;
  role: string;
}

export const auth_service = {
  register: (input: RegisterInput): Promise<TResult<AuthResponse>> => api.post<RegisterInput, AuthResponse>("/auth/register", input),

  login: (input: LoginInput): Promise<TResult<AuthResponse>> => api.post<LoginInput, AuthResponse>("/auth/login", input),

  me: (signal?: AbortSignal): Promise<TResult<AuthSession>> => api.get<AuthSession>("/auth/me", undefined, signal),
};
