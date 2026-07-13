import { boolean, customType, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.schema";

export const bytea = customType<{ data: Buffer }>({
  dataType: () => "bytea",
});

export const cvVersions = pgTable("cv_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  focus: text("focus").notNull(),
  tags: text("tags").array().notNull().default([]),
  esPerfilSalida: boolean("es_perfil_salida").notNull().default(false),
  estado: text("estado").notNull(),
  archivoCv: bytea("archivo_cv"),
  tamanioBytes: integer("tamanio_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
