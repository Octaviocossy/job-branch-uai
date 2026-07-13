import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import type { Env } from "../../config/env.validation";
import { JwtService } from "./jwt.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        secret: configService.get("JWT_SECRET", { infer: true }),
        signOptions: { expiresIn: configService.get("JWT_EXPIRES_IN", { infer: true }) },
      }),
    }),
  ],
  providers: [JwtService, JwtAuthGuard],
  exports: [JwtService, JwtAuthGuard],
})
export class AuthSharedModule {}
