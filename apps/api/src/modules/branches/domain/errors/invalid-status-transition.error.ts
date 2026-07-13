import type { ApplicationStatus } from "@repo/models";

/** Raised when a hito would move a branch out of its §7.2 state machine bounds. */
export class InvalidStatusTransitionError extends Error {
  constructor(from: ApplicationStatus, to: ApplicationStatus) {
    super(`Cannot move branch from "${from}" to "${to}"`);
    this.name = "InvalidStatusTransitionError";
  }
}
