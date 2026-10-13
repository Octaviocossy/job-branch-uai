import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ResolverPermisosUseCase } from "../../modules/security/application/use-cases/resolver-permisos.use-case";
import { ContextoSeguridad } from "../../modules/security/domain/contexto-seguridad";
import { REQUIERE_ACCION_KEY } from "../decorators/requiere-accion.decorator";
import type { AuthorizedRequest } from "../types/authorized-request";

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

    const request = context.switchToHttp().getRequest<AuthorizedRequest>();

    // Interim, per request: the Sesion slice moves this to Sesion start (invariant 13) and replaces this one
    // assignment with the context the Sesion initializes; `@ContextoActual()` keeps reading the same property.
    request.contextoSeguridad ??= new ContextoSeguridad(await this.resolverPermisosUseCase.execute(request.user.sub));

    if (!request.contextoSeguridad.tienePermiso(codigoAccion)) {
      throw new ForbiddenException(`Missing permission: ${codigoAccion}`);
    }

    return true;
  }
}
