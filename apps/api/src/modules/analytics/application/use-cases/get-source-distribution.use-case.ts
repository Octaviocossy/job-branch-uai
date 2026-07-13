import { Inject, Injectable } from "@nestjs/common";
import type { SourceDistribution } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { ANALYTICS_READ_REPOSITORY, type AnalyticsReadRepository } from "../../domain/analytics-read.repository";
import { foldSourceDistribution } from "../analytics.folds";

@Injectable()
export class GetSourceDistributionUseCase {
  constructor(
    @Inject(ANALYTICS_READ_REPOSITORY) private readonly analyticsReadRepository: AnalyticsReadRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GetSourceDistributionUseCase.name);
  }

  async execute(userId: string): Promise<SourceDistribution[]> {
    this.logger.debug(`Computing source distribution for user=${userId}`);
    const rows = await this.analyticsReadRepository.findApplicationsByUser(userId);

    return foldSourceDistribution(rows);
  }
}
