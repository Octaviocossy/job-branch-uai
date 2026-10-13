import { z } from "zod";

export const usuarioSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  nombreCompleto: z.string().min(1),
  authProvider: z.string().min(1),
  intentosFallidos: z.number().int().min(0),
});

export type Usuario = z.infer<typeof usuarioSchema>;
