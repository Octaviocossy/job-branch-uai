import { Global, Module } from "@nestjs/common";
import { PersonaModule } from "../persona/persona.module";
import { SecurityModule } from "../security/security.module";
import { UsersModule } from "../users/users.module";
import { ContextosSesionStore } from "./application/contextos-sesion.store";
import { PasswordService } from "./application/password.service";
import { CerrarSesionUseCase } from "./application/use-cases/cerrar-sesion.use-case";
import { IniciarSesionUseCase } from "./application/use-cases/iniciar-sesion.use-case";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { RegisterUseCase } from "./application/use-cases/register.use-case";
import { ValidarSesionUseCase } from "./application/use-cases/validar-sesion.use-case";
import { SESION_REPOSITORY } from "./domain/sesion.repository";
import { DrizzleSesionRepository } from "./infrastructure/drizzle-sesion.repository";
import { AuthController } from "./presentation/auth.controller";

// @Global so JwtAuthGuard, which every protected controller uses, reaches ValidarSesionUseCase without each feature module importing this one.
@Global()
@Module({
  imports: [UsersModule, SecurityModule, PersonaModule],
  controllers: [AuthController],
  providers: [
    RegisterUseCase,
    LoginUseCase,
    IniciarSesionUseCase,
    ValidarSesionUseCase,
    CerrarSesionUseCase,
    ContextosSesionStore,
    PasswordService,
    { provide: SESION_REPOSITORY, useClass: DrizzleSesionRepository },
  ],
  exports: [ValidarSesionUseCase],
})
export class AuthModule {}
