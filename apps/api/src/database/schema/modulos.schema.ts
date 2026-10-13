import { pgTable, text, uuid } from "drizzle-orm/pg-core";

// Seed catalog: fixed ids from `catalogo-matriz.ts`, synced at boot. Outside the Composite tree (ADR-0023).
export const modulos = pgTable("modulos", {
  id: uuid("id").primaryKey(),
  nombre: text("nombre").notNull().unique(),
});
