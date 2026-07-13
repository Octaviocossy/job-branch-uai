import { z } from "zod";
import { userRoleSchema, userSchema } from "./user.schema.js";

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  displayName: z.string().min(1),
  role: userRoleSchema,
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const authResponseSchema = z.object({
  token: z.string().min(1),
  user: userSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
