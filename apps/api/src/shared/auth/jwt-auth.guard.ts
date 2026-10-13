import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { AuthorizedRequest } from "../../common/types/authorized-request";
import { ValidarSesionUseCase } from "../../modules/auth/application/use-cases/validar-sesion.use-case";
import { type JwtPayload, JwtService } from "./jwt.service";

export type AuthenticatedRequest = Request & { user: JwtPayload; sesionId?: string };

/**
 * Authenticates a request: a valid bearer token that names a live Sesion (database lookup on every request). On success
 * the request carries `user` (the token claims), `sesionId` and the `contextoSeguridad` the Sesion initialized when it
 * started, which `PermissionsGuard` and `@ContextoActual()` read.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly validarSesionUseCase: ValidarSesionUseCase,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthorizedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    let payload: JwtPayload;

    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

    const vigente = await this.validarSesionUseCase.execute(token);

    if (!vigente) {
      throw new UnauthorizedException("Sesión inválida o expirada");
    }

    request.user = payload;
    request.sesionId = vigente.sesionId;
    request.contextoSeguridad = vigente.contexto;

    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;

    if (!header?.startsWith("Bearer ")) {
      return undefined;
    }

    return header.slice("Bearer ".length);
  }
}
