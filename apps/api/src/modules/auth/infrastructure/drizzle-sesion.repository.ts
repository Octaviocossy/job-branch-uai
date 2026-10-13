import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import { sesiones } from "../../../database/schema/index";
import { Sesion } from "../domain/sesion";
import type { NuevaSesion, SesionRepository } from "../domain/sesion.repository";

type SesionRow = typeof sesiones.$inferSelect;

function toDomain(row: SesionRow): Sesion {
  return new Sesion(row.id, row.usuarioId, row.tokenJWT, row.fechaEmision, row.fechaExpiracion);
}

@Injectable()
export class DrizzleSesionRepository implements SesionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async crear(nueva: NuevaSesion): Promise<Sesion> {
    const [row] = await this.db.insert(sesiones).values(nueva).returning();

    if (!row) {
      throw new Error("Failed to create sesion");
    }

    return toDomain(row);
  }

  async buscarPorToken(tokenJWT: string): Promise<Sesion | null> {
    const [row] = await this.db.select().from(sesiones).where(eq(sesiones.tokenJWT, tokenJWT));

    return row ? toDomain(row) : null;
  }

  async buscarPorId(id: string): Promise<Sesion | null> {
    const [row] = await this.db.select().from(sesiones).where(eq(sesiones.id, id));

    return row ? toDomain(row) : null;
  }

  async guardar(sesion: Sesion): Promise<void> {
    await this.db.update(sesiones).set({ fechaExpiracion: sesion.fechaExpiracion }).where(eq(sesiones.id, sesion.id));
  }
}
