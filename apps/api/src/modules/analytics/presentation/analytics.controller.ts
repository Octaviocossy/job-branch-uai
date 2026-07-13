import { Controller, Get, UseGuards } from "@nestjs/common";
import type { AnalyticsOverview } from "@repo/models";
import { CurrentUser } from "../../../shared/auth/current-user.decorator";
import type { JwtPayload } from "../../../shared/auth/jwt.service";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { GetConversionUseCase } from "../application/use-cases/get-conversion.use-case";
import { GetProfileRoiUseCase } from "../application/use-cases/get-profile-roi.use-case";
import { GetSkillGapsUseCase } from "../application/use-cases/get-skill-gaps.use-case";
import { GetSourceDistributionUseCase } from "../application/use-cases/get-source-distribution.use-case";
import { GetTechHeatmapUseCase } from "../application/use-cases/get-tech-heatmap.use-case";
import { GetUserStatsUseCase } from "../application/use-cases/get-user-stats.use-case";

@UseGuards(JwtAuthGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(
    private readonly getConversionUseCase: GetConversionUseCase,
    private readonly getProfileRoiUseCase: GetProfileRoiUseCase,
    private readonly getTechHeatmapUseCase: GetTechHeatmapUseCase,
    private readonly getSkillGapsUseCase: GetSkillGapsUseCase,
    private readonly getSourceDistributionUseCase: GetSourceDistributionUseCase,
    private readonly getUserStatsUseCase: GetUserStatsUseCase,
  ) {}

  @Get("overview")
  async overview(@CurrentUser() user: JwtPayload): Promise<AnalyticsOverview> {
    const [conversion, roi, heatmap, gaps, sources, stats] = await Promise.all([
      this.getConversionUseCase.execute(user.sub),
      this.getProfileRoiUseCase.execute(user.sub),
      this.getTechHeatmapUseCase.execute(user.sub),
      this.getSkillGapsUseCase.execute(user.sub),
      this.getSourceDistributionUseCase.execute(user.sub),
      this.getUserStatsUseCase.execute(user.sub),
    ]);

    return { conversion, roi, heatmap, gaps, sources, stats };
  }
}
