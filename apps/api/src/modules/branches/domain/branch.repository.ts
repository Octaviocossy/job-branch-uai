import type { Application, CreateApplicationInput, CreateFeedbackInput, CreateHitoInput, Feedback, Hito } from "@repo/models";

export const BRANCH_REPOSITORY = Symbol("BRANCH_REPOSITORY");

export interface FindAllByUserOptions {
  archived?: boolean;
}

export interface AddHitoResult {
  application: Application;
  hito: Hito;
}

export interface BranchRepository {
  findAllByUser(userId: string, options?: FindAllByUserOptions): Promise<Application[]>;
  findById(id: string, userId: string): Promise<Application | null>;
  create(userId: string, input: CreateApplicationInput): Promise<Application>;
  clone(id: string, userId: string): Promise<Application | null>;
  archive(id: string, userId: string): Promise<Application | null>;
  addHito(id: string, userId: string, input: CreateHitoInput): Promise<AddHitoResult | null>;
  addFeedback(branchId: string, hitoId: string, userId: string, input: CreateFeedbackInput): Promise<Feedback | null>;
}
