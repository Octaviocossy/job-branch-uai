import type { ContextoSeguridad } from "../../modules/security/domain/contexto-seguridad";
import type { AuthenticatedRequest } from "../../shared/auth/jwt-auth.guard";

/** An authenticated request once `JwtAuthGuard` has put the caller's Sesion's ContextoSeguridad on it; read through `@ContextoActual()`. */
export type AuthorizedRequest = AuthenticatedRequest & { contextoSeguridad?: ContextoSeguridad };
