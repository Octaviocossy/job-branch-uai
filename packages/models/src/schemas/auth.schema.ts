import { z } from "zod";
import { usuarioSchema } from "./usuario.schema";

/** The roles a person may choose at registration — never `administrador` (invariant 2). */
export const registerRoleSchema = z.enum(["postulante", "recruiter"]);

export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  nombreCompleto: z.string().min(1),
  role: registerRoleSchema,
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const authResponseSchema = z.object({
  token: z.string().min(1),
  user: usuarioSchema,
});

export const meResponseSchema = z.object({
  user: usuarioSchema,
  permisos: z.array(z.string()),
});

export type RegisterRole = z.infer<typeof registerRoleSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
