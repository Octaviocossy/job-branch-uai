import { Inject, Injectable } from "@nestjs/common";
import type { Application, ApplicationStatus, CreateApplicationInput, CreateFeedbackInput, CreateHitoInput, Feedback, Hito, Recruiter } from "@repo/models";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import type * as schema from "../../../database/schema/index";
import { applications, cvVersions, empresas, feedback as feedbackTable, hitos, vacantes } from "../../../database/schema/index";
import type { AddHitoResult, BranchRepository, FindAllByUserOptions } from "../domain/branch.repository";
import { CvVersionNotFoundError } from "../domain/errors/cv-version-not-found.error";

/** Accepted by both `this.db` and a `db.transaction(tx => ...)` callback's `tx`, so writes that must be atomic can share one client. */
type DbClient = PgDatabase<NodePgQueryResultHKT, typeof schema>;

const branchColumns = {
  id: applications.id,
  vacanteId: applications.vacanteId,
  cvVersionId: applications.cvVersionId,
  status: applications.status,
  appliedDate: applications.appliedDate,
  lastUpdated: applications.lastUpdated,
  recruiterName: applications.recruiterName,
  recruiterLinkedin: applications.recruiterLinkedin,
  recruiterEmail: applications.recruiterEmail,
  techStack: applications.techStack,
  notes: applications.notes,
  salary: applications.salary,
  location: applications.location,
  source: applications.source,
  archived: applications.archived,
  company: empresas.nombre,
  role: vacantes.titulo,
  cvVersionName: cvVersions.name,
};

interface BranchRow {
  id: string;
  vacanteId: string;
  cvVersionId: string;
  status: string;
  appliedDate: string;
  lastUpdated: string;
  recruiterName: string | null;
  recruiterLinkedin: string | null;
  recruiterEmail: string | null;
  techStack: string[];
  notes: string | null;
  salary: string | null;
  location: string | null;
  source: string | null;
  archived: boolean;
  company: string;
  role: string;
  cvVersionName: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class DrizzleBranchRepository implements BranchRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findAllByUser(userId: string, options?: FindAllByUserOptions): Promise<Application[]> {
    const rows = await this.db
      .select(branchColumns)
      .from(applications)
      .innerJoin(vacantes, eq(applications.vacanteId, vacantes.id))
      .innerJoin(empresas, eq(vacantes.empresaId, empresas.id))
      .innerJoin(cvVersions, eq(applications.cvVersionId, cvVersions.id))
      .where(and(eq(applications.usuarioId, userId), options?.archived === undefined ? undefined : eq(applications.archived, options.archived)))
      .orderBy(desc(applications.lastUpdated));

    const timelines = await this.timelinesByBranchId(
      this.db,
      rows.map((row) => row.id),
    );

    return rows.map((row) => this.toApplication(row, timelines.get(row.id) ?? []));
  }

  findById(id: string, userId: string): Promise<Application | null> {
    return this.loadById(this.db, id, userId);
  }

  async create(userId: string, input: CreateApplicationInput): Promise<Application> {
    return this.db.transaction(async (tx) => {
      const empresa = await this.findOrCreateEmpresa(tx, input.company);
      const vacante = await this.findOrCreateVacante(tx, empresa.id, input.company, input.role, input);
      const cvVersion = await this.findCvVersionByName(tx, userId, input.cvVersion);

      const [created] = await tx
        .insert(applications)
        .values({
          usuarioId: userId,
          vacanteId: vacante.id,
          cvVersionId: cvVersion.id,
          status: input.status,
          appliedDate: input.appliedDate,
          lastUpdated: input.appliedDate,
          recruiterName: input.recruiter?.name,
          recruiterLinkedin: input.recruiter?.linkedin,
          recruiterEmail: input.recruiter?.email,
          techStack: [...input.techStack],
          notes: input.notes,
          salary: input.salary,
          location: input.location,
          source: input.source,
          archived: input.archived ?? false,
        })
        .returning();

      if (!created) {
        throw new Error("Failed to create branch");
      }

      // The initial hito mirrors the branch's starting status, so the timeline and the
      // branch's own `status` never disagree.
      await tx.insert(hitos).values({
        ramaId: created.id,
        date: input.appliedDate,
        status: input.status,
      });

      const branch = await this.loadById(tx, created.id, userId);

      if (!branch) {
        throw new Error("Failed to load branch after creation");
      }

      return branch;
    });
  }

  async clone(id: string, userId: string): Promise<Application | null> {
    return this.db.transaction(async (tx) => {
      const [original] = await tx
        .select()
        .from(applications)
        .where(and(eq(applications.id, id), eq(applications.usuarioId, userId)));

      if (!original) {
        return null;
      }

      const appliedDate = today();

      const [created] = await tx
        .insert(applications)
        .values({
          usuarioId: userId,
          vacanteId: original.vacanteId,
          cvVersionId: original.cvVersionId,
          status: "Enviado",
          appliedDate,
          lastUpdated: appliedDate,
          recruiterName: original.recruiterName,
          recruiterLinkedin: original.recruiterLinkedin,
          recruiterEmail: original.recruiterEmail,
          techStack: [...original.techStack],
          notes: original.notes,
          salary: original.salary,
          location: original.location,
          source: original.source,
          archived: false,
        })
        .returning();

      if (!created) {
        throw new Error(`Failed to clone branch ${id}`);
      }

      await tx.insert(hitos).values({
        ramaId: created.id,
        date: appliedDate,
        status: "Enviado",
        note: `Clonado de la rama ${id}`,
      });

      return this.loadById(tx, created.id, userId);
    });
  }

  async archive(id: string, userId: string): Promise<Application | null> {
    return this.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(applications)
        .set({ status: "Archivado", archived: true, lastUpdated: today() })
        .where(and(eq(applications.id, id), eq(applications.usuarioId, userId)))
        .returning();

      if (!updated) {
        return null;
      }

      await tx.insert(hitos).values({
        ramaId: id,
        date: today(),
        status: "Archivado",
        note: "Rama archivada",
      });

      return this.loadById(tx, id, userId);
    });
  }

  async addHito(id: string, userId: string, input: CreateHitoInput): Promise<AddHitoResult | null> {
    return this.db.transaction(async (tx) => {
      const [owned] = await tx
        .select({ id: applications.id })
        .from(applications)
        .where(and(eq(applications.id, id), eq(applications.usuarioId, userId)));

      if (!owned) {
        return null;
      }

      const [createdHito] = await tx
        .insert(hitos)
        .values({
          ramaId: id,
          date: input.date,
          status: input.status,
          note: input.note,
          daysInStage: input.daysInStage,
          tipo: input.tipo,
          fechaRecordatorioFollowUp: input.fechaRecordatorioFollowUp,
          observaciones: input.observaciones,
        })
        .returning();

      if (!createdHito) {
        throw new Error(`Failed to add hito to branch ${id}`);
      }

      await tx
        .update(applications)
        .set({ status: input.status, lastUpdated: input.date })
        .where(and(eq(applications.id, id), eq(applications.usuarioId, userId)));

      const application = await this.loadById(tx, id, userId);

      if (!application) {
        throw new Error(`Failed to load branch ${id} after adding hito`);
      }

      return { application, hito: this.toHito(createdHito) };
    });
  }

  async addFeedback(branchId: string, hitoId: string, userId: string, input: CreateFeedbackInput): Promise<Feedback | null> {
    return this.db.transaction(async (tx) => {
      const [owned] = await tx
        .select({ id: hitos.id })
        .from(hitos)
        .innerJoin(applications, eq(hitos.ramaId, applications.id))
        .where(and(eq(hitos.id, hitoId), eq(applications.id, branchId), eq(applications.usuarioId, userId)));

      if (!owned) {
        return null;
      }

      const [created] = await tx
        .insert(feedbackTable)
        .values({
          hitoId,
          fechaEntrevista: input.fechaEntrevista,
          tipoEntrevista: input.tipoEntrevista,
          scoreTecnico: input.scoreTecnico,
          scoreCultura: input.scoreCultura,
          comentarios: input.comentarios,
          habilidadesFaltantes: [...input.habilidadesFaltantes],
        })
        .returning();

      if (!created) {
        throw new Error(`Failed to create feedback for hito ${hitoId}`);
      }

      return this.toFeedback(created);
    });
  }

  private async loadById(db: DbClient, id: string, userId: string): Promise<Application | null> {
    const [row] = await db
      .select(branchColumns)
      .from(applications)
      .innerJoin(vacantes, eq(applications.vacanteId, vacantes.id))
      .innerJoin(empresas, eq(vacantes.empresaId, empresas.id))
      .innerJoin(cvVersions, eq(applications.cvVersionId, cvVersions.id))
      .where(and(eq(applications.id, id), eq(applications.usuarioId, userId)));

    if (!row) {
      return null;
    }

    const timeline = await this.timelineFor(db, id);

    return this.toApplication(row, timeline);
  }

  private async findOrCreateEmpresa(db: DbClient, nombre: string) {
    const [existing] = await db.select().from(empresas).where(eq(empresas.nombre, nombre));

    if (existing) {
      return existing;
    }

    const [created] = await db.insert(empresas).values({ nombre, industria: "No especificada" }).returning();

    if (!created) {
      throw new Error(`Failed to create empresa ${nombre}`);
    }

    return created;
  }

  private async findOrCreateVacante(db: DbClient, empresaId: string, company: string, role: string, input: CreateApplicationInput) {
    const [existing] = await db
      .select()
      .from(vacantes)
      .where(and(eq(vacantes.empresaId, empresaId), eq(vacantes.titulo, role)));

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(vacantes)
      .values({
        titulo: role,
        descripcion: `Vacante de ${role} en ${company}.`,
        tecnologiasRequeridas: [...input.techStack],
        rangoSalarial: input.salary ?? "No especificado",
        empresaId,
      })
      .returning();

    if (!created) {
      throw new Error(`Failed to create vacante ${role}`);
    }

    return created;
  }

  private async findCvVersionByName(db: DbClient, userId: string, name: string) {
    const [cvVersion] = await db
      .select()
      .from(cvVersions)
      .where(and(eq(cvVersions.usuarioId, userId), eq(cvVersions.name, name)));

    if (!cvVersion) {
      throw new CvVersionNotFoundError(name);
    }

    return cvVersion;
  }

  private async timelineFor(db: DbClient, ramaId: string): Promise<Hito[]> {
    const rows = await db.select().from(hitos).where(eq(hitos.ramaId, ramaId)).orderBy(asc(hitos.date), asc(hitos.id));

    return rows.map((row) => this.toHito(row));
  }

  private async timelinesByBranchId(db: DbClient, ramaIds: string[]): Promise<Map<string, Hito[]>> {
    if (ramaIds.length === 0) {
      return new Map();
    }

    const rows = await db.select().from(hitos).where(inArray(hitos.ramaId, ramaIds)).orderBy(asc(hitos.date), asc(hitos.id));

    const timelines = new Map<string, Hito[]>();

    for (const row of rows) {
      const hito = this.toHito(row);
      const existing = timelines.get(row.ramaId);

      if (existing) {
        existing.push(hito);
      } else {
        timelines.set(row.ramaId, [hito]);
      }
    }

    return timelines;
  }

  private toHito(row: typeof hitos.$inferSelect): Hito {
    return {
      id: row.id,
      ramaId: row.ramaId,
      date: row.date,
      status: row.status as ApplicationStatus,
      note: row.note ?? undefined,
      daysInStage: row.daysInStage ?? undefined,
      tipo: row.tipo ?? undefined,
      fechaRecordatorioFollowUp: row.fechaRecordatorioFollowUp ?? undefined,
      observaciones: row.observaciones ?? undefined,
    };
  }

  private toFeedback(row: typeof feedbackTable.$inferSelect): Feedback {
    return {
      id: row.id,
      hitoId: row.hitoId,
      fechaEntrevista: row.fechaEntrevista,
      tipoEntrevista: row.tipoEntrevista,
      scoreTecnico: row.scoreTecnico,
      scoreCultura: row.scoreCultura,
      comentarios: row.comentarios,
      habilidadesFaltantes: row.habilidadesFaltantes,
    };
  }

  private toApplication(row: BranchRow, timeline: Hito[]): Application {
    const recruiter: Recruiter | undefined = row.recruiterName
      ? { name: row.recruiterName, linkedin: row.recruiterLinkedin ?? undefined, email: row.recruiterEmail ?? undefined }
      : undefined;

    return {
      id: row.id,
      company: row.company,
      role: row.role,
      status: row.status as ApplicationStatus,
      cvVersion: row.cvVersionName,
      appliedDate: row.appliedDate,
      lastUpdated: row.lastUpdated,
      recruiter,
      techStack: row.techStack,
      notes: row.notes ?? undefined,
      salary: row.salary ?? undefined,
      location: row.location ?? undefined,
      source: row.source ?? undefined,
      archived: row.archived,
      timeline,
    };
  }
}
