import { Inject, Injectable } from "@nestjs/common";
import type { CreatePersonaInput, Persona } from "@repo/models";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import { personaComponentes, personas } from "../../../database/schema/index";
import type { PersonaRepository } from "../domain/persona.repository";

type PersonaRow = typeof personas.$inferSelect;

/**
 * Inserts a Persona and the roots it holds through `db`. Run it inside a transaction so a Persona never exists
 * without roots (invariant 12) — `create` does, and so does the seed.
 */
export async function insertarPersonaConRaices(db: Pick<Database, "insert">, input: CreatePersonaInput, raices: readonly string[]): Promise<PersonaRow> {
  const [row] = await db.insert(personas).values(toRow(input)).returning();

  if (!row) {
    throw new Error("Failed to create persona");
  }

  await db.insert(personaComponentes).values(raices.map((componenteId) => ({ personaId: row.id, componenteId })));

  return row;
}

function toRow(input: CreatePersonaInput): typeof personas.$inferInsert {
  const base = {
    usuarioId: input.usuarioId,
    tipo: input.tipo,
    puestoCorporativo: input.puestoCorporativo,
    perNombre: null,
    perApellido: null,
    fechaContratacion: null,
    habilidadesMaster: [],
  };

  switch (input.tipo) {
    case "recruiter":
      return { ...base, perNombre: input.perNombre, perApellido: input.perApellido, fechaContratacion: input.fechaContratacion };
    case "postulante":
      return { ...base, habilidadesMaster: input.habilidadesMaster };
    case "administrador":
      return base;
  }
}

@Injectable()
export class DrizzlePersonaRepository implements PersonaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreatePersonaInput, raices: readonly string[]): Promise<Persona> {
    return this.db.transaction(async (tx) => this.toDomain(await insertarPersonaConRaices(tx, input, raices)));
  }

  async findByUsuarioId(usuarioId: string): Promise<Persona | null> {
    const [row] = await this.db.select().from(personas).where(eq(personas.usuarioId, usuarioId));

    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: PersonaRow): Persona {
    const base = { id: row.id, usuarioId: row.usuarioId, puestoCorporativo: row.puestoCorporativo };

    switch (row.tipo) {
      case "recruiter":
        return {
          ...base,
          tipo: "recruiter",
          perNombre: row.perNombre ?? "",
          perApellido: row.perApellido ?? "",
          fechaContratacion: row.fechaContratacion ?? "",
        };
      case "postulante":
        return { ...base, tipo: "postulante", habilidadesMaster: row.habilidadesMaster };
      case "administrador":
        return { ...base, tipo: "administrador" };
    }
  }
}
