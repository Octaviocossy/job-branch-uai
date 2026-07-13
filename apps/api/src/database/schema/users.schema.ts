import type { UserRole } from "@repo/models";
import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").$type<UserRole>().notNull(),
  passwordHash: text("password_hash"),
  authProvider: text("auth_provider").notNull().default("native"),
  intentosFallidos: integer("intentos_fallidos").notNull().default(0),
});
