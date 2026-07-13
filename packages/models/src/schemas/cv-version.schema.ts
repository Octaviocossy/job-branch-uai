import { z } from "zod";

export const cvVersionEstadoSchema = z.enum(["borrador", "disponible", "seleccionado_salida", "archivado"]);

export const cvVersionRendimientoSchema = z.object({
  applications: z.number().int().nonnegative(),
  interviews: z.number().int().nonnegative(),
});

export const cvVersionSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
  focus: z.string().min(1),
  tags: z.array(z.string()),
  esPerfilSalida: z.boolean(),
  estado: cvVersionEstadoSchema,
  tamanioBytes: z.number().int().positive(),
  createdAt: z.iso.date(),
  rendimiento: cvVersionRendimientoSchema,
});

export const createCvVersionSchema = cvVersionSchema.omit({ id: true, createdAt: true, rendimiento: true });

export type CvVersionEstado = z.infer<typeof cvVersionEstadoSchema>;
export type CvVersionRendimiento = z.infer<typeof cvVersionRendimientoSchema>;
export type CvVersion = z.infer<typeof cvVersionSchema>;
export type CreateCvVersionInput = z.infer<typeof createCvVersionSchema>;
