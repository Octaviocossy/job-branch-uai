import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { ContextoSeguridad } from "../../modules/security/domain/contexto-seguridad";
import type { AuthorizedRequest } from "../types/authorized-request";

/** The caller's ContextoSeguridad, put on the request by `PermissionsGuard`. */
export const ContextoActual = createParamDecorator((_data: unknown, ctx: ExecutionContext): ContextoSeguridad => {
  const contexto = ctx.switchToHttp().getRequest<AuthorizedRequest>().contextoSeguridad;

  if (!contexto) {
    throw new Error("ContextoSeguridad missing — the handler must run behind PermissionsGuard");
  }

  return contexto;
});
