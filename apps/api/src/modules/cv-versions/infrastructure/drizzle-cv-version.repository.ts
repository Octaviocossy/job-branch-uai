import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CvVersionEstado, CvVersionRendimiento } from "@repo/models";
import { and, eq, inArray } from "drizzle-orm";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import { applications, cvVersions, hitos } from "../../../database/schema/index";
import type { CreateCvVersionParams, CvVersionRecord, CvVersionRepository, UpdateCvFileParams } from "../domain/cv-version.repository";

function toRecord(row: typeof cvVersions.$inferSelect): CvVersionRecord {
  return {
    id: row.id,
    name: row.name,
    focus: row.focus,
    tags: row.tags,
    esPerfilSalida: row.esPerfilSalida,
    estado: row.estado as CvVersionEstado,
    tamanioBytes: row.tamanioBytes ?? 0,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    snapshotVacanteId: row.snapshotVacanteId ?? null,
  };
}

@Injectable()
export class DrizzleCvVersionRepository implements CvVersionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAllByUser(usuarioId: string): Promise<CvVersionRecord[]> {
    const rows = await this.db.select().from(cvVersions).where(eq(cvVersions.usuarioId, usuarioId));

    return rows.map(toRecord);
  }

  async findById(id: string, usuarioId: string): Promise<CvVersionRecord | null> {
    const [row] = await this.db
      .select()
      .from(cvVersions)
      .where(and(eq(cvVersions.id, id), eq(cvVersions.usuarioId, usuarioId)));

    return row ? toRecord(row) : null;
  }

  async create(params: CreateCvVersionParams): Promise<CvVersionRecord> {
    const [row] = await this.db
      .insert(cvVersions)
      .values({
        usuarioId: params.usuarioId,
        name: params.name,
        focus: params.focus,
        tags: params.tags,
        esPerfilSalida: false,
        estado: "borrador",
      })
      .returning();

    if (!row) {
      throw new Error("Failed to create cv version");
    }

    return toRecord(row);
  }

  async updateFile(id: string, usuarioId: string, params: UpdateCvFileParams): Promise<CvVersionRecord> {
    const [row] = await this.db
      .update(cvVersions)
      .set({ archivoCv: params.buffer, tamanioBytes: params.sizeBytes, estado: params.estado })
      .where(and(eq(cvVersions.id, id), eq(cvVersions.usuarioId, usuarioId)))
      .returning();

    if (!row) {
      throw new NotFoundException(`CV version ${id} not found`);
    }

    return toRecord(row);
  }

  async setOutputProfile(id: string, usuarioId: string): Promise<CvVersionRecord> {
    return this.db.transaction(async (tx) => {
      await tx
        .update(cvVersions)
        .set({ esPerfilSalida: false, estado: "disponible" })
        .where(and(eq(cvVersions.usuarioId, usuarioId), eq(cvVersions.esPerfilSalida, true)));

      const [row] = await tx
        .update(cvVersions)
        .set({ esPerfilSalida: true, estado: "seleccionado_salida" })
        .where(and(eq(cvVersions.id, id), eq(cvVersions.usuarioId, usuarioId)))
        .returning();

      if (!row) {
        throw new NotFoundException(`CV version ${id} not found`);
      }

      return toRecord(row);
    });
  }

  async archive(id: string, usuarioId: string): Promise<CvVersionRecord> {
    const [row] = await this.db
      .update(cvVersions)
      .set({ estado: "archivado", esPerfilSalida: false })
      .where(and(eq(cvVersions.id, id), eq(cvVersions.usuarioId, usuarioId)))
      .returning();

    if (!row) {
      throw new NotFoundException(`CV version ${id} not found`);
    }

    return toRecord(row);
  }

  async computeRendimiento(cvVersionId: string): Promise<CvVersionRendimiento> {
    const relatedApplications = await this.db.select({ id: applications.id }).from(applications).where(eq(applications.cvVersionId, cvVersionId));

    if (relatedApplications.length === 0) {
      return { applications: 0, interviews: 0 };
    }

    const applicationIds = relatedApplications.map((application) => application.id);
    const interviewRows = await this.db
      .selectDistinct({ ramaId: hitos.ramaId })
      .from(hitos)
      .where(and(inArray(hitos.ramaId, applicationIds), eq(hitos.status, "Entrevista Técnica")));

    return { applications: relatedApplications.length, interviews: interviewRows.length };
  }
}
