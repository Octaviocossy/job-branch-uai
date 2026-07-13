import type { ApplicationStatus, CreateRecordatorioInput, Recordatorio, Recruiter } from "@repo/models";

export const FOLLOWUP_REPOSITORY = Symbol("FOLLOWUP_REPOSITORY");

export interface FollowupBranch {
  ramaId: string;
  usuarioId: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  lastUpdated: string;
  recruiter?: Recruiter;
}

export interface FollowupRepository {
  findActiveBranches(usuarioId: string): Promise<FollowupBranch[]>;
  findBranchById(ramaId: string): Promise<FollowupBranch | null>;
  findRecordatorioByRamaId(ramaId: string): Promise<Recordatorio | null>;
  upsertRecordatorio(input: CreateRecordatorioInput): Promise<Recordatorio>;
}
