import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ResolverPermisosUseCase } from "../../modules/security/application/use-cases/resolver-permisos.use-case";
import { ContextoSeguridad } from "../../modules/security/domain/contexto-seguridad";
import type { JwtPayload } from "../../shared/auth/jwt.service";
import { REQUIERE_ACCION_KEY } from "../decorators/requiere-accion.decorator";
import type { AuthorizedRequest } from "../types/authorized-request";

@Injectable()
export class PermissionsGuard implements CanActivate {
  // Interim stand-in for the Sesion (invariant 13): a ContextoSeguridad is built once per login — a token is
  // one login — and lives until that token expires, so a grant change applies from the next login. The Sesion
  // slice replaces `contextoDe` with the context the Sesion initializes when it starts; `@ContextoActual()`
  // keeps reading `request.contextoSeguridad`. Keyed by token, never by role: two Usuarios of one role differ.
  private readonly contextos = new Map<string, { contexto: ContextoSeguridad; expiraEn: number }>();

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

    request.contextoSeguridad ??= await this.contextoDe(request.user);

    if (!request.contextoSeguridad.tienePermiso(codigoAccion)) {
      throw new ForbiddenException(`Missing permission: ${codigoAccion}`);
    }

    return true;
  }

  private async contextoDe(user: JwtPayload): Promise<ContextoSeguridad> {
    const { iat, exp } = user;
    const clave = iat !== undefined && exp !== undefined ? `${user.sub}:${iat}` : undefined;
    const ahora = Date.now() / 1000;
    const existente = clave ? this.contextos.get(clave) : undefined;

    if (existente && existente.expiraEn > ahora) {
      return existente.contexto;
    }

    const contexto = new ContextoSeguridad(await this.resolverPermisosUseCase.execute(user.sub));

    if (clave && exp !== undefined) {
      this.descartarVencidos(ahora);
      this.contextos.set(clave, { contexto, expiraEn: exp });
    }

    return contexto;
  }

  private descartarVencidos(ahora: number): void {
    for (const [clave, { expiraEn }] of this.contextos) {
      if (expiraEn <= ahora) {
        this.contextos.delete(clave);
      }
    }
  }
}
