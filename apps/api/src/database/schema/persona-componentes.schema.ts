import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { componentes } from "./componentes.schema";
import { personas } from "./personas.schema";

// The roots each Persona holds (`Persona *—1..* ComponentePermiso`, invariant 12).
export const personaComponentes = pgTable(
  "persona_componentes",
  {
    personaId: uuid("persona_id")
      .notNull()
      .references(() => personas.id),
    componenteId: uuid("componente_id")
      .notNull()
      .references(() => componentes.id),
  },
  (t) => [primaryKey({ columns: [t.personaId, t.componenteId] })],
);
