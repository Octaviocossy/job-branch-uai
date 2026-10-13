import { z } from "zod";
import { personaTipoSchema } from "./persona.schema";

export const permissionMatrixSchema = z.object({
  role: personaTipoSchema,
  acciones: z.array(z.string().min(1)),
});

export type PermissionMatrix = z.infer<typeof permissionMatrixSchema>;
