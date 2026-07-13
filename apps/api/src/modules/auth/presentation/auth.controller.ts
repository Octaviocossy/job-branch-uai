import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { type AuthResponse, type LoginInput, loginSchema, type RegisterInput, registerSchema, type UserRole } from "@repo/models";
import { RequiereAccion } from "../../../common/decorators/requiere-accion.decorator";
import { PermissionsGuard } from "../../../common/guards/permissions.guard";
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe";
import { CurrentUser } from "../../../shared/auth/current-user.decorator";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import type { JwtPayload } from "../../../shared/auth/jwt.service";
import { ResolverPermisosUseCase } from "../../security/application/use-cases/resolver-permisos.use-case";
import { LoginUseCase } from "../application/use-cases/login.use-case";
import { RegisterUseCase } from "../application/use-cases/register.use-case";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly resolverPermisosUseCase: ResolverPermisosUseCase,
  ) {}

  @Post("register")
  register(@Body(new ZodValidationPipe(registerSchema)) body: RegisterInput): Promise<AuthResponse> {
    return this.registerUseCase.execute(body);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput): Promise<AuthResponse> {
    return this.loginUseCase.execute(body);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiereAccion("auth.me")
  me(@CurrentUser() user: JwtPayload): JwtPayload & { permisos: string[] } {
    const role = user.role as UserRole;
    const contexto = this.resolverPermisosUseCase.execute(role);

    return { ...user, permisos: contexto.listarAcciones() };
  }
}
