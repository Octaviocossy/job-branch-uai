import { z } from "zod";

export const recordatorioEstadoSchema = z.enum(["pendiente", "notificado", "resuelto"]);

export const recordatorioSchema = z.object({
  id: z.uuid(),
  ramaId: z.uuid(),
  fechaVencimiento: z.iso.date(),
  diasInactividad: z.number().int().nonnegative(),
  estado: recordatorioEstadoSchema,
});

export const createRecordatorioSchema = recordatorioSchema.omit({ id: true });

export type RecordatorioEstado = z.infer<typeof recordatorioEstadoSchema>;
export type Recordatorio = z.infer<typeof recordatorioSchema>;
export type CreateRecordatorioInput = z.infer<typeof createRecordatorioSchema>;
