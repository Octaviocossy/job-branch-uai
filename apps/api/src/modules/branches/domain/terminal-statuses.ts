import type { ApplicationStatus } from "@repo/models";

/** Statuses that end a branch's pipeline (see §7.2 in the ubiquitous-language state machine). */
export const TERMINAL_STATUSES: ApplicationStatus[] = ["Oferta", "Rechazado", "Archivado"];
