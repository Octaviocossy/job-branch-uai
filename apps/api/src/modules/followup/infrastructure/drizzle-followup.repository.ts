import { Inject, Injectable } from "@nestjs/common";
import type { ApplicationStatus, CreateRecordatorioInput, Recordatorio, RecordatorioEstado, Recruiter } from "@repo/models";
import { and, eq, notInArray } from "drizzle-orm";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import { applications, empresas, recordatorios, vacantes } from "../../../database/schema/index";
import type { FollowupBranch, FollowupRepository } from "../domain/followup.repository";

const INACTIVE_BRANCH_STATUSES: string[] = ["Archivado", "Oferta", "Rechazado"];

@Injectable()
export class DrizzleFollowupRepository implements FollowupRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findActiveBranches(usuarioId: string): Promise<FollowupBranch[]> {
    const rows = await this.db
      .select({
        ramaId: applications.id,
        usuarioId: applications.usuarioId,
        company: empresas.nombre,
        role: vacantes.titulo,
        status: applications.status,
        lastUpdated: applications.lastUpdated,
        recruiterName: applications.recruiterName,
        recruiterLinkedin: applications.recruiterLinkedin,
        recruiterEmail: applications.recruiterEmail,
      })
      .from(applications)
      .innerJoin(vacantes, eq(applications.vacanteId, vacantes.id))
      .innerJoin(empresas, eq(vacantes.empresaId, empresas.id))
      .where(and(eq(applications.usuarioId, usuarioId), eq(applications.archived, false), notInArray(applications.status, INACTIVE_BRANCH_STATUSES)));

    return rows.map(toFollowupBranch);
  }

  async findBranchById(ramaId: string): Promise<FollowupBranch | null> {
    const [row] = await this.db
      .select({
        ramaId: applications.id,
        usuarioId: applications.usuarioId,
        company: empresas.nombre,
        role: vacantes.titulo,
        status: applications.status,
        lastUpdated: applications.lastUpdated,
        recruiterName: applications.recruiterName,
        recruiterLinkedin: applications.recruiterLinkedin,
        recruiterEmail: applications.recruiterEmail,
      })
      .from(applications)
      .innerJoin(vacantes, eq(applications.vacanteId, vacantes.id))
      .innerJoin(empresas, eq(vacantes.empresaId, empresas.id))
      .where(eq(applications.id, ramaId));

    return row ? toFollowupBranch(row) : null;
  }

  async findRecordatorioByRamaId(ramaId: string): Promise<Recordatorio | null> {
    const [row] = await this.db.select().from(recordatorios).where(eq(recordatorios.ramaId, ramaId));

    return row ? toRecordatorio(row) : null;
  }

  async upsertRecordatorio(input: CreateRecordatorioInput): Promise<Recordatorio> {
    const existing = await this.findRecordatorioByRamaId(input.ramaId);

    if (existing) {
      const [updated] = await this.db
        .update(recordatorios)
        .set({ fechaVencimiento: input.fechaVencimiento, diasInactividad: input.diasInactividad, estado: input.estado })
        .where(eq(recordatorios.id, existing.id))
        .returning();

      if (!updated) {
        throw new Error(`Failed to update recordatorio for rama ${input.ramaId}`);
      }

      return toRecordatorio(updated);
    }

    const [created] = await this.db.insert(recordatorios).values(input).returning();

    if (!created) {
      throw new Error(`Failed to create recordatorio for rama ${input.ramaId}`);
    }

    return toRecordatorio(created);
  }
}

interface FollowupBranchRow {
  ramaId: string;
  usuarioId: string;
  company: string;
  role: string;
  status: string;
  lastUpdated: string;
  recruiterName: string | null;
  recruiterLinkedin: string | null;
  recruiterEmail: string | null;
}

function toFollowupBranch(row: FollowupBranchRow): FollowupBranch {
  const recruiter = toRecruiter(row.recruiterName, row.recruiterLinkedin, row.recruiterEmail);

  return {
    ramaId: row.ramaId,
    usuarioId: row.usuarioId,
    company: row.company,
    role: row.role,
    status: row.status as ApplicationStatus,
    lastUpdated: row.lastUpdated,
    recruiter,
  };
}

function toRecruiter(name: string | null, linkedin: string | null, email: string | null): Recruiter | undefined {
  if (!name) {
    return undefined;
  }

  return {
    name,
    ...(linkedin ? { linkedin } : {}),
    ...(email ? { email } : {}),
  };
}

interface RecordatorioRow {
  id: string;
  ramaId: string;
  fechaVencimiento: string;
  diasInactividad: number;
  estado: string;
}

function toRecordatorio(row: RecordatorioRow): Recordatorio {
  return {
    id: row.id,
    ramaId: row.ramaId,
    fechaVencimiento: row.fechaVencimiento,
    diasInactividad: row.diasInactividad,
    estado: row.estado as RecordatorioEstado,
  };
}
