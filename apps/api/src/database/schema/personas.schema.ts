import type { PersonaTipo } from "@repo/models";
import { date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { usuarios } from "./usuarios.schema";

export const personas = pgTable("personas", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .unique()
    .references(() => usuarios.id),
  tipo: text("tipo").$type<PersonaTipo>().notNull(),
  puestoCorporativo: text("puesto_corporativo"),
  // recruiter-only
  perNombre: text("per_nombre"),
  perApellido: text("per_apellido"),
  fechaContratacion: date("fecha_contratacion"),
  // postulante-only
  habilidadesMaster: text("habilidades_master").array().notNull().default([]),
});
