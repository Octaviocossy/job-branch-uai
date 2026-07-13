import { z } from "zod";

export const userRoleSchema = z.enum(["postulante", "recruiter"]);

export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().min(1),
  role: userRoleSchema,
});

export const createUserSchema = userSchema.omit({ id: true });

export type UserRole = z.infer<typeof userRoleSchema>;
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
