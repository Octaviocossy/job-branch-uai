import { z } from "zod";

export const feedbackSchema = z.object({
  id: z.uuid(),
  hitoId: z.uuid(),
  fechaEntrevista: z.iso.date(),
  tipoEntrevista: z.string().min(1),
  scoreTecnico: z.number().int().min(0).max(10),
  scoreCultura: z.number().int().min(0).max(10),
  comentarios: z.string().min(1),
  habilidadesFaltantes: z.array(z.string()),
});

export const createFeedbackSchema = feedbackSchema.omit({ id: true });

export type Feedback = z.infer<typeof feedbackSchema>;
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
