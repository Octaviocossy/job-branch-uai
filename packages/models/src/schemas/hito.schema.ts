import { z } from "zod";

export const applicationStatusSchema = z.enum(["Enviado", "Entrevista Técnica", "RRHH", "Oferta", "Rechazado", "Archivado"]);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

export const PIPELINE_STAGES: ApplicationStatus[] = ["Enviado", "RRHH", "Entrevista Técnica", "Oferta", "Rechazado"];

export const hitoSchema = z.object({
  id: z.uuid(),
  ramaId: z.uuid(),
  date: z.iso.date(),
  status: applicationStatusSchema,
  note: z.string().optional(),
  daysInStage: z.number().int().nonnegative().optional(),
  tipo: z.string().optional(),
  fechaRecordatorioFollowUp: z.iso.date().optional(),
  observaciones: z.string().optional(),
});

export const createHitoSchema = hitoSchema.omit({ id: true });

export type Hito = z.infer<typeof hitoSchema>;
export type CreateHitoInput = z.infer<typeof createHitoSchema>;
