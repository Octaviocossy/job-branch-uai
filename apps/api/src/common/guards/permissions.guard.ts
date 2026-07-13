import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@repo/models";
import { ResolverPermisosUseCase } from "../../modules/security/application/use-cases/resolver-permisos.use-case";
import type { ContextoSeguridad } from "../../modules/security/domain/contexto-seguridad";
import type { AuthenticatedRequest } from "../../shared/auth/jwt-auth.guard";
import { REQUIERE_ACCION_KEY } from "../decorators/requiere-accion.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly cache = new Map<UserRole, ContextoSeguridad>();

  constructor(
    private readonly reflector: Reflector,
    private readonly resolverPermisosUseCase: ResolverPermisosUseCase,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const codigoAccion = this.reflector.getAllAndOverride<string | undefined>(REQUIERE_ACCION_KEY, [context.getHandler(), context.getClass()]);

    if (!codigoAccion) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const contexto = this.resolverContexto(request.user.role as UserRole);

    if (!contexto.tienePermiso(codigoAccion)) {
      throw new ForbiddenException(`Missing permission: ${codigoAccion}`);
    }

    return true;
  }

  private resolverContexto(role: UserRole): ContextoSeguridad {
    const cached = this.cache.get(role);

    if (cached) {
      return cached;
    }

    const contexto = this.resolverPermisosUseCase.execute(role);
    this.cache.set(role, contexto);

    return contexto;
  }
}
