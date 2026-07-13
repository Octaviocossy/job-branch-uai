import { date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { hitos } from "./hitos.schema";

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  hitoId: uuid("hito_id")
    .notNull()
    .references(() => hitos.id),
  fechaEntrevista: date("fecha_entrevista").notNull(),
  tipoEntrevista: text("tipo_entrevista").notNull(),
  scoreTecnico: integer("score_tecnico").notNull(),
  scoreCultura: integer("score_cultura").notNull(),
  comentarios: text("comentarios").notNull(),
  habilidadesFaltantes: text("habilidades_faltantes").array().notNull().default([]),
});
