import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const empresas = pgTable("empresas", {
  id: uuid("id").primaryKey().defaultRandom(),
  nombre: text("nombre").notNull(),
  industria: text("industria").notNull(),
  sitioWeb: text("sitio_web"),
  reputacionTimeResponse: integer("reputacion_time_response"),
});
