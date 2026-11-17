import { z } from "zod";

export const messageSchema = z.object({
  id: z.uuid(),
  conversacionId: z.uuid(),
  usuarioId: z.uuid(),
  contenido: z.string(),
  createdAt: z.date(),
  leidoAt: z.date().nullable(),
});

export const sendMessageSchema = z.object({
  contenido: z.string().trim().min(1).max(4000),
});

export type Message = z.infer<typeof messageSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;