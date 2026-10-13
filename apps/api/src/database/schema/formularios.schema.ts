import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { modulos } from "./modulos.schema";

// Seed catalog: fixed ids from `catalogo-matriz.ts`, synced at boot. Outside the Composite tree (ADR-0023).
export const formularios = pgTable("formularios", {
  id: uuid("id").primaryKey(),
  nombre: text("nombre").notNull(),
  moduloId: uuid("modulo_id")
    .notNull()
    .references(() => modulos.id),
});
