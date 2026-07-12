import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./modules/health/health.module";
import { UsersModule } from "./modules/users/users.module";
import { LoggerModule } from "./shared/logger/logger.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), EventEmitterModule.forRoot(), LoggerModule, DatabaseModule, HealthModule, UsersModule],
})
export class AppModule {}
