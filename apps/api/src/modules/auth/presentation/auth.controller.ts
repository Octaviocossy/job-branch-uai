import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Post, Req, UseGuards } from "@nestjs/common";
import { type AuthResponse, type LoginInput, loginSchema, type MeResponse, type RegisterInput, registerSchema } from "@repo/models";
import { ContextoActual } from "../../../common/decorators/contexto-actual.decorator";
import { RequiereAccion } from "../../../common/decorators/requiere-accion.decorator";
import { PermissionsGuard } from "../../../common/guards/permissions.guard";
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe";
import { CurrentUser } from "../../../shared/auth/current-user.decorator";
import type { JwtPayload } from "../../../shared/auth/jwt.service";
import { type AuthenticatedRequest, JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import type { ContextoSeguridad } from "../../security/domain/contexto-seguridad";
import { GetUserUseCase } from "../../users/application/use-cases/get-user.use-case";
import { CerrarSesionUseCase } from "../application/use-cases/cerrar-sesion.use-case";
import { LoginUseCase } from "../application/use-cases/login.use-case";
import { RegisterUseCase } from "../application/use-cases/register.use-case";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly cerrarSesionUseCase: CerrarSesionUseCase,
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
  async me(@CurrentUser() payload: JwtPayload, @ContextoActual() contexto: ContextoSeguridad): Promise<MeResponse> {
    const user = await this.getUserUseCase.execute(payload.sub);

    if (!user) {
      throw new NotFoundException("Usuario no encontrado");
    }

    return { user, permisos: contexto.listarAcciones() };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiereAccion("auth.logout")
  async logout(@Req() request: AuthenticatedRequest): Promise<void> {
    // JwtAuthGuard always sets `sesionId` before a handler behind it runs.
    await this.cerrarSesionUseCase.execute(request.sesionId as string);
  }
}
