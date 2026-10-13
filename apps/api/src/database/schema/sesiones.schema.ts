import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { usuarios } from "./usuarios.schema";

// A Usuario's login sessions (`Usuario 1—0..* Sesion`, invariant 12). A row is never deleted: a Sesion ends by expiry (invariant 14).
export const sesiones = pgTable("sesiones", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuarios.id),
  /** SHA-256 hex of the issued JWT — never the token itself (invariant 14). */
  tokenJWT: text("token_jwt").notNull().unique(),
  fechaEmision: timestamp("fecha_emision", { withTimezone: true }).notNull().defaultNow(),
  fechaExpiracion: timestamp("fecha_expiracion", { withTimezone: true }).notNull(),
});
