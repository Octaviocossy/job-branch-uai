import { date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications.schema";

export const hitos = pgTable("hitos", {
  id: uuid("id").primaryKey().defaultRandom(),
  ramaId: uuid("rama_id")
    .notNull()
    .references(() => applications.id),
  date: date("date").notNull(),
  status: text("status").notNull(),
  note: text("note"),
  daysInStage: integer("days_in_stage"),
  tipo: text("tipo"),
  fechaRecordatorioFollowUp: date("fecha_recordatorio_follow_up"),
  observaciones: text("observaciones"),
});
