import type { Application } from "@repo/models";

/** Event name for the in-process "a branch was archived" domain event. */
export const BRANCH_ARCHIVED_EVENT = "branch.archived";

/** Payload published with {@link BRANCH_ARCHIVED_EVENT}. */
export interface BranchArchivedEvent {
  branch: Application;
}
