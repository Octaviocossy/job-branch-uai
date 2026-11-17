import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { conversaciones } from "./conversaciones.schema";
import { usuarios } from "./usuarios.schema";

export const mensajes = pgTable("mensajes", {
  id: uuid("id").primaryKey().defaultRandom(),

  conversacionId: uuid("conversacion_id")
    .notNull()
    .references(() => conversaciones.id, { onDelete: "cascade" }),

  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuarios.id),

  contenido: text("contenido").notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),

  leidoAt: timestamp("leido_at"),
});