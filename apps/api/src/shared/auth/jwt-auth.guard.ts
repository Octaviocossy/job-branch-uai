import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { ContextoSeguridad } from "../../modules/security/domain/contexto-seguridad";
import { type JwtPayload, JwtService } from "./jwt.service";

/** `contextoSeguridad` is set by `PermissionsGuard` and read through `@ContextoActual()`. */
export type AuthenticatedRequest = Request & { user: JwtPayload; contextoSeguridad?: ContextoSeguridad };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      request.user = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }

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
