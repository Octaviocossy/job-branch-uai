import { Inject, Injectable } from "@nestjs/common";
import type { UserStats } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { ANALYTICS_READ_REPOSITORY, type AnalyticsReadRepository } from "../../domain/analytics-read.repository";
import { foldUserStats } from "../analytics.folds";

@Injectable()
export class GetUserStatsUseCase {
  constructor(
    @Inject(ANALYTICS_READ_REPOSITORY) private readonly analyticsReadRepository: AnalyticsReadRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GetUserStatsUseCase.name);
  }

  async execute(userId: string): Promise<UserStats> {
    this.logger.debug(`Computing user stats for user=${userId}`);
    const rows = await this.analyticsReadRepository.findApplicationsByUser(userId);

    return foldUserStats(rows);
  }
}
