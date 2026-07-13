import { date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { applications } from "./applications.schema";

export const recordatorios = pgTable("recordatorios", {
  id: uuid("id").primaryKey().defaultRandom(),
  ramaId: uuid("rama_id")
    .notNull()
    .references(() => applications.id),
  fechaVencimiento: date("fecha_vencimiento").notNull(),
  diasInactividad: integer("dias_inactividad").notNull().default(0),
  estado: text("estado").notNull().default("pendiente"),
});
