import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const usuarios = pgTable("usuarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  nombreCompleto: text("nombre_completo").notNull(),
  passwordHash: text("password_hash"),
  authProvider: text("auth_provider").notNull().default("native"),
  intentosFallidos: integer("intentos_fallidos").notNull().default(0),
});
