import { sql } from "drizzle-orm";
import { type AnyPgColumn, check, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { formularios } from "./formularios.schema";

// One row per ComponentePermiso. `padre_id` is `contiene` (one parent at most, invariant 12).
export const componentes = pgTable(
  "componentes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tipo: text("tipo").$type<"grupo" | "accion">().notNull(),
    nombre: text("nombre").notNull(),
    descripcion: text("descripcion"),
    codigoAccion: text("codigo_accion").unique(),
    formularioId: uuid("formulario_id").references(() => formularios.id),
    padreId: uuid("padre_id").references((): AnyPgColumn => componentes.id),
  },
  (t) => [
    check(
      "componentes_tipo_check",
      sql`(${t.tipo} = 'grupo' and ${t.codigoAccion} is null and ${t.formularioId} is null) or (${t.tipo} = 'accion' and ${t.codigoAccion} is not null and ${t.formularioId} is not null)`,
    ),
  ],
);
