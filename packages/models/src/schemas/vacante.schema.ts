import { z } from "zod";

export const vacanteSchema = z.object({
  id: z.uuid(),
  titulo: z.string().min(1),
  descripcion: z.string().min(1),
  tecnologiasRequeridas: z.array(z.string()),
  rangoSalarial: z.string().min(1),
  empresaId: z.uuid(),
});

export const createVacanteSchema = vacanteSchema.omit({ id: true });

export type Vacante = z.infer<typeof vacanteSchema>;
export type CreateVacanteInput = z.infer<typeof createVacanteSchema>;
