import { Inject, Injectable } from "@nestjs/common";
import type { CreatePersonaInput, Persona } from "@repo/models";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import { personas } from "../../../database/schema/index";
import type { PersonaRepository } from "../domain/persona.repository";

type PersonaRow = typeof personas.$inferSelect;

@Injectable()
export class DrizzlePersonaRepository implements PersonaRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async create(input: CreatePersonaInput): Promise<Persona> {
    const values =
      input.tipo === "recruiter"
        ? {
            usuarioId: input.usuarioId,
            tipo: input.tipo,
            puestoCorporativo: input.puestoCorporativo,
            perNombre: input.perNombre,
            perApellido: input.perApellido,
            fechaContratacion: input.fechaContratacion,
            habilidadesMaster: [],
          }
        : {
            usuarioId: input.usuarioId,
            tipo: input.tipo,
            puestoCorporativo: input.puestoCorporativo,
            perNombre: null,
            perApellido: null,
            fechaContratacion: null,
            habilidadesMaster: input.habilidadesMaster,
          };

    const [row] = await this.db.insert(personas).values(values).returning();

    if (!row) {
      throw new Error("Failed to create persona");
    }

    return this.toDomain(row);
  }

  async findByUsuarioId(usuarioId: string): Promise<Persona | null> {
    const [row] = await this.db.select().from(personas).where(eq(personas.usuarioId, usuarioId));

    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: PersonaRow): Persona {
    if (row.tipo === "recruiter") {
      return {
        id: row.id,
        usuarioId: row.usuarioId,
        puestoCorporativo: row.puestoCorporativo,
        tipo: "recruiter",
        perNombre: row.perNombre ?? "",
        perApellido: row.perApellido ?? "",
        fechaContratacion: row.fechaContratacion ?? "",
      };
    }

    return {
      id: row.id,
      usuarioId: row.usuarioId,
      puestoCorporativo: row.puestoCorporativo,
      tipo: "postulante",
      habilidadesMaster: row.habilidadesMaster,
    };
  }
}
