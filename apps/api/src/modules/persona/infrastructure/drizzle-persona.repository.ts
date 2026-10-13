import { Inject, Injectable } from "@nestjs/common";
import type { CreatePersonaInput, Persona } from "@repo/models";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import { personaComponentes, personas } from "../../../database/schema/index";
import type { PersonaRepository } from "../domain/persona.repository";

type PersonaRow = typeof personas.$inferSelect;

@Injectable()
export class DrizzlePersonaRepository implements PersonaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreatePersonaInput, raices: readonly string[]): Promise<Persona> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.insert(personas).values(this.toRow(input)).returning();

      if (!row) {
        throw new Error("Failed to create persona");
      }

      await tx.insert(personaComponentes).values(raices.map((componenteId) => ({ personaId: row.id, componenteId })));

      return this.toDomain(row);
    });
  }

  async findByUsuarioId(usuarioId: string): Promise<Persona | null> {
    const [row] = await this.db.select().from(personas).where(eq(personas.usuarioId, usuarioId));

    return row ? this.toDomain(row) : null;
  }

  private toRow(input: CreatePersonaInput): typeof personas.$inferInsert {
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
