import { Inject, Injectable } from "@nestjs/common";
import type { ApplicationStatus } from "@repo/models";
import { eq, inArray } from "drizzle-orm";
import { DRIZZLE } from "../../../database/database.constants";
import type { Database } from "../../../database/database.module";
import { applications, cvVersions, hitos } from "../../../database/schema/index";
import type { AnalyticsApplicationRow, AnalyticsReadRepository } from "../domain/analytics-read.repository";

@Injectable()
export class DrizzleAnalyticsReadRepository implements AnalyticsReadRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findApplicationsByUser(userId: string): Promise<AnalyticsApplicationRow[]> {
    const applicationRows = await this.db.select().from(applications).where(eq(applications.usuarioId, userId));

    if (applicationRows.length === 0) {
      return [];
    }

    const applicationIds = applicationRows.map((row) => row.id);
    const hitoRows = await this.db.select().from(hitos).where(inArray(hitos.ramaId, applicationIds));

    const hitoStatusesByApplication = new Map<string, ApplicationStatus[]>();

    for (const hito of hitoRows) {
      const statuses = hitoStatusesByApplication.get(hito.ramaId) ?? [];
      statuses.push(hito.status as ApplicationStatus);
      hitoStatusesByApplication.set(hito.ramaId, statuses);
    }

    return applicationRows.map((row) => ({
      id: row.id,
      cvVersionId: row.cvVersionId,
      status: row.status as ApplicationStatus,
      techStack: row.techStack,
      source: row.source,
      hitoStatuses: hitoStatusesByApplication.get(row.id) ?? [],
    }));
  }

  async findCvVersionIdsByUser(userId: string): Promise<string[]> {
    const rows = await this.db.select({ id: cvVersions.id }).from(cvVersions).where(eq(cvVersions.usuarioId, userId));

    return rows.map((row) => row.id);
  }
}
