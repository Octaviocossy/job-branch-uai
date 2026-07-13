import type { ApplicationStatus, Conversion, ProfileRoi, SkillGap, SourceDistribution, TechHeatmap, UserStats } from "@repo/models";
import type { AnalyticsApplicationRow } from "../domain/analytics-read.repository";

export const FUNNEL_STAGES: ApplicationStatus[] = ["Enviado", "RRHH", "Entrevista Técnica", "Oferta"];

const ADVANCED_STATUSES: ApplicationStatus[] = ["Entrevista Técnica", "RRHH", "Oferta"];

const DEFAULT_SOURCE = "Otro";

const TOP_N_TECHNOLOGIES = 10;

export interface TechCounts {
  technology: string;
  applications: number;
  rejections: number;
  advances: number;
}

function reachedStages(row: AnalyticsApplicationRow): Set<ApplicationStatus> {
  return new Set<ApplicationStatus>([row.status, ...row.hitoStatuses]);
}

export function foldConversion(rows: AnalyticsApplicationRow[]): Conversion[] {
  const total = rows.length;

  return FUNNEL_STAGES.map((stage) => {
    const count = rows.filter((row) => reachedStages(row).has(stage)).length;

    return { stage, count, conversionRate: total === 0 ? 0 : count / total };
  });
}

export function foldProfileRoi(rows: AnalyticsApplicationRow[], cvVersionIds: string[]): ProfileRoi[] {
  const byCvVersion = new Map<string, AnalyticsApplicationRow[]>();

  for (const cvVersionId of cvVersionIds) {
    byCvVersion.set(cvVersionId, []);
  }

  for (const row of rows) {
    const group = byCvVersion.get(row.cvVersionId) ?? [];
    group.push(row);
    byCvVersion.set(row.cvVersionId, group);
  }

  return Array.from(byCvVersion.entries())
    .map(([cvVersionId, group]) => {
      const applications = group.length;
      const interviews = group.filter((row) => reachedStages(row).has("Entrevista Técnica")).length;

      return {
        cvVersionId,
        applications,
        interviews,
        roi: applications === 0 ? 0 : interviews / applications,
      };
    })
    .sort((a, b) => b.roi - a.roi);
}

export function computeTechCounts(rows: AnalyticsApplicationRow[]): TechCounts[] {
  const counts = new Map<string, TechCounts>();

  for (const row of rows) {
    for (const technology of row.techStack) {
      const entry = counts.get(technology) ?? { technology, applications: 0, rejections: 0, advances: 0 };

      entry.applications += 1;

      if (row.status === "Rechazado") {
        entry.rejections += 1;
      } else if (ADVANCED_STATUSES.includes(row.status)) {
        entry.advances += 1;
      }

      counts.set(technology, entry);
    }
  }

  return Array.from(counts.values());
}

export function heatmapScore(entry: TechCounts): number {
  return entry.advances - entry.rejections;
}

export function foldTechHeatmap(rows: AnalyticsApplicationRow[], topN = TOP_N_TECHNOLOGIES): TechHeatmap[] {
  return computeTechCounts(rows)
    .sort((a, b) => b.rejections - a.rejections)
    .slice(0, topN)
    .map(({ technology, applications, rejections, advances }) => ({ technology, applications, rejections, advances }));
}

export function foldSkillGaps(rows: AnalyticsApplicationRow[]): SkillGap[] {
  return computeTechCounts(rows)
    .filter((entry) => entry.rejections > entry.advances)
    .map((entry) => ({ skill: entry.technology, missingCount: entry.rejections }));
}

export function foldSourceDistribution(rows: AnalyticsApplicationRow[]): SourceDistribution[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const source = row.source ?? DEFAULT_SOURCE;
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([source, count]) => ({ source, count }));
}

export function foldUserStats(rows: AnalyticsApplicationRow[]): UserStats {
  const totalInterviews = rows.filter((row) => reachedStages(row).has("Entrevista Técnica")).length;
  const roiGlobal = rows.length === 0 ? 0 : totalInterviews / rows.length;
  const gapHabilidades = foldSkillGaps(rows).map((gap) => gap.skill);

  return { roiGlobal, gapHabilidades };
}
