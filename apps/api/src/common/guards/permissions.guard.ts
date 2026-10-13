import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ContextosSeguridadService } from "../../modules/security/application/contextos-seguridad.service";
import { REQUIERE_ACCION_KEY } from "../decorators/requiere-accion.decorator";
import type { AuthorizedRequest } from "../types/authorized-request";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly contextos: ContextosSeguridadService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const codigoAccion = this.reflector.getAllAndOverride<string | undefined>(REQUIERE_ACCION_KEY, [context.getHandler(), context.getClass()]);

    if (!codigoAccion) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthorizedRequest>();

    request.contextoSeguridad ??= await this.contextos.obtener(request.user);

    if (!request.contextoSeguridad.tienePermiso(codigoAccion)) {
      throw new ForbiddenException(`Missing permission: ${codigoAccion}`);
    }

    return true;
  }
}
