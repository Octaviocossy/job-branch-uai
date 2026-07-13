import { z } from "zod";
import { userRoleSchema } from "./user.schema.js";

export const permissionMatrixSchema = z.object({
  role: userRoleSchema,
  acciones: z.array(z.string().min(1)),
});

export type PermissionMatrix = z.infer<typeof permissionMatrixSchema>;
