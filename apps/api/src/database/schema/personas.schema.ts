import { date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const personas = pgTable("personas", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .unique()
    .references(() => users.id),
  tipo: text("tipo").notNull(), // "recruiter" | "postulante"
  puestoCorporativo: text("puesto_corporativo"),
  // recruiter-only
  perNombre: text("per_nombre"),
  perApellido: text("per_apellido"),
  fechaContratacion: date("fecha_contratacion"),
  // postulante-only
  habilidadesMaster: text("habilidades_master").array().notNull().default([]),
});
