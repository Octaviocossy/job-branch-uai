import type { MeResponse } from "@/models";

/** A `GET /auth/me` response for Ada Lovelace holding exactly the given codigoAccion values. */
export function sessionWith(codes: string[]): MeResponse {
  return {
    user: {
      id: "5f1c1f0e-8f3a-4d1e-9c55-3d2a9a7e2b10",
      email: "ada@example.com",
      nombreCompleto: "Ada Lovelace",
      authProvider: "native",
      intentosFallidos: 0,
    },
    permisos: codes,
  };
}

/** Every code a Postulante holds that the web gates on, plus the session codes. */
export const ALL_POSTULANTE_CODES = [
  "auth.me",
  "auth.logout",
  "security.viewMatrix",
  "branch.list",
  "branch.view",
  "branch.create",
  "branch.clone",
  "branch.addHito",
  "branch.addFeedback",
  "branch.archive",
  "cv.list",
  "cv.create",
  "cv.upload",
  "cv.setOutput",
  "cv.setSnapshotVacante",
  "cv.archive",
  "analytics.overview",
  "followup.list",
  "followup.resolve",
];

/** What an Administrador holds: only the session, security and user codes. */
export const ADMINISTRADOR_CODES = [
  "auth.me",
  "auth.logout",
  "security.viewMatrix",
  "security.viewCatalog",
  "security.listGroups",
  "security.createGroup",
  "security.updateGroup",
  "security.deleteGroup",
  "security.listPersonas",
  "security.assignRoot",
  "security.removeRoot",
  "usuario.list",
  "usuario.view",
];
