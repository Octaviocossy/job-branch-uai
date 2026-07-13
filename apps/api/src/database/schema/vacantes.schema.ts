import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { empresas } from "./empresas.schema";

export const vacantes = pgTable("vacantes", {
  id: uuid("id").primaryKey().defaultRandom(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion").notNull(),
  tecnologiasRequeridas: text("tecnologias_requeridas").array().notNull().default([]),
  rangoSalarial: text("rango_salarial").notNull(),
  empresaId: uuid("empresa_id")
    .notNull()
    .references(() => empresas.id),
});
