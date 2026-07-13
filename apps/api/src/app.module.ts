import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { validateEnv } from "./config/env.validation";
import { DatabaseModule } from "./database/database.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { CvVersionsModule } from "./modules/cv-versions/cv-versions.module";
import { FollowupModule } from "./modules/followup/followup.module";
import { HealthModule } from "./modules/health/health.module";
import { SecurityModule } from "./modules/security/security.module";
import { UsersModule } from "./modules/users/users.module";
import { AuthSharedModule } from "./shared/auth/auth-shared.module";
import { LoggerModule } from "./shared/logger/logger.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    EventEmitterModule.forRoot(),
    LoggerModule,
    DatabaseModule,
    AuthSharedModule,
    HealthModule,
    UsersModule,
    SecurityModule,
    AuthModule,
    CvVersionsModule,
    BranchesModule,
    AnalyticsModule,
    FollowupModule,
  ],
})
export class AppModule {}
