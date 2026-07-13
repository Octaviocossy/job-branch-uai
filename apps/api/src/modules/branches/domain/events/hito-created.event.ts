import type { Hito } from "@repo/models";

/** Event name for the in-process "a hito was appended to a branch" domain event. */
export const HITO_CREATED_EVENT = "hito.created";

/** Payload published with {@link HITO_CREATED_EVENT}. */
export interface HitoCreatedEvent {
  branchId: string;
  hito: Hito;
}
