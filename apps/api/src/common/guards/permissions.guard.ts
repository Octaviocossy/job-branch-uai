import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ResolverPermisosUseCase } from "../../modules/security/application/use-cases/resolver-permisos.use-case";
import { ContextoSeguridad } from "../../modules/security/domain/contexto-seguridad";
import type { AuthenticatedRequest } from "../../shared/auth/jwt-auth.guard";
import { REQUIERE_ACCION_KEY } from "../decorators/requiere-accion.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resolverPermisosUseCase: ResolverPermisosUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const codigoAccion = this.reflector.getAllAndOverride<string | undefined>(REQUIERE_ACCION_KEY, [context.getHandler(), context.getClass()]);

    if (!codigoAccion) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Interim: resolved per request from the database. The Sesion slice replaces this single assignment
    // with the context the Sesion built when it started (invariant 13); `@ContextoActual()` keeps reading the same field.
    request.contextoSeguridad ??= new ContextoSeguridad(await this.resolverPermisosUseCase.execute(request.user.sub));

    if (!request.contextoSeguridad.tienePermiso(codigoAccion)) {
      throw new ForbiddenException(`Missing permission: ${codigoAccion}`);
    }

    return true;
  }
}
