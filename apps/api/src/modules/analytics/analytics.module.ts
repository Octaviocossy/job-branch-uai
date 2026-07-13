import { Module } from "@nestjs/common";
import { GetConversionUseCase } from "./application/use-cases/get-conversion.use-case";
import { GetProfileRoiUseCase } from "./application/use-cases/get-profile-roi.use-case";
import { GetSkillGapsUseCase } from "./application/use-cases/get-skill-gaps.use-case";
import { GetSourceDistributionUseCase } from "./application/use-cases/get-source-distribution.use-case";
import { GetTechHeatmapUseCase } from "./application/use-cases/get-tech-heatmap.use-case";
import { GetUserStatsUseCase } from "./application/use-cases/get-user-stats.use-case";
import { ANALYTICS_READ_REPOSITORY } from "./domain/analytics-read.repository";
import { DrizzleAnalyticsReadRepository } from "./infrastructure/drizzle-analytics-read.repository";
import { AnalyticsController } from "./presentation/analytics.controller";

@Module({
  controllers: [AnalyticsController],
  providers: [
    GetConversionUseCase,
    GetProfileRoiUseCase,
    GetTechHeatmapUseCase,
    GetSkillGapsUseCase,
    GetSourceDistributionUseCase,
    GetUserStatsUseCase,
    { provide: ANALYTICS_READ_REPOSITORY, useClass: DrizzleAnalyticsReadRepository },
  ],
})
export class AnalyticsModule {}
