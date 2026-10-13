import type { ContextoSeguridad } from "../../modules/security/domain/contexto-seguridad";
import type { AuthenticatedRequest } from "../../shared/auth/jwt-auth.guard";

/** An authenticated request once `PermissionsGuard` has put the caller's ContextoSeguridad on it; read through `@ContextoActual()`. */
export type AuthorizedRequest = AuthenticatedRequest & { contextoSeguridad?: ContextoSeguridad };
