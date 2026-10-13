import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { REQUIERE_ACCION_KEY } from "../decorators/requiere-accion.decorator";
import type { AuthorizedRequest } from "../types/authorized-request";

/** Checks the action a handler requires against the ContextoSeguridad its Sesion initialized; it never resolves permissions itself (invariant 13). */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const codigoAccion = this.reflector.getAllAndOverride<string | undefined>(REQUIERE_ACCION_KEY, [context.getHandler(), context.getClass()]);

    if (!codigoAccion) {
      return true;
    }

    const { contextoSeguridad } = context.switchToHttp().getRequest<AuthorizedRequest>();

    // Only reachable when PermissionsGuard runs without JwtAuthGuard before it, a programming error: deny.
    if (!contextoSeguridad) {
      throw new ForbiddenException("ContextoSeguridad missing — PermissionsGuard must run after JwtAuthGuard");
    }

    if (!contextoSeguridad.tienePermiso(codigoAccion)) {
      throw new ForbiddenException(`Missing permission: ${codigoAccion}`);
    }

    return true;
  }
}
