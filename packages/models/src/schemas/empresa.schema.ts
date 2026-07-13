import { z } from "zod";

export const empresaSchema = z.object({
  id: z.uuid(),
  nombre: z.string().min(1),
  industria: z.string().min(1),
  sitioWeb: z.url().optional(),
  reputacionTimeResponse: z.number().int().nonnegative().optional(),
});

export const createEmpresaSchema = empresaSchema.omit({ id: true });

export type Empresa = z.infer<typeof empresaSchema>;
export type CreateEmpresaInput = z.infer<typeof createEmpresaSchema>;
