import type { ApplicationStatus } from "@repo/models";

export const ANALYTICS_READ_REPOSITORY = Symbol("ANALYTICS_READ_REPOSITORY");

export interface AnalyticsApplicationRow {
  id: string;
  cvVersionId: string;
  status: ApplicationStatus;
  techStack: string[];
  source: string | null;
  hitoStatuses: ApplicationStatus[];
}

export interface AnalyticsReadRepository {
  findApplicationsByUser(userId: string): Promise<AnalyticsApplicationRow[]>;
  findCvVersionIdsByUser(userId: string): Promise<string[]>;
}
