import { Module } from "@nestjs/common";
import { PersonaModule } from "../persona/persona.module";
import { SecurityModule } from "../security/security.module";
import { UsersModule } from "../users/users.module";
import { PasswordService } from "./application/password.service";
import { LoginUseCase } from "./application/use-cases/login.use-case";
import { RegisterUseCase } from "./application/use-cases/register.use-case";
import { AuthController } from "./presentation/auth.controller";

@Module({
  imports: [UsersModule, SecurityModule, PersonaModule],
  controllers: [AuthController],
  providers: [RegisterUseCase, LoginUseCase, PasswordService],
})
export class AuthModule {}
