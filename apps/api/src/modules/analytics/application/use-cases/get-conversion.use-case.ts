import { Inject, Injectable } from "@nestjs/common";
import type { Conversion } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { ANALYTICS_READ_REPOSITORY, type AnalyticsReadRepository } from "../../domain/analytics-read.repository";
import { foldConversion } from "../analytics.folds";

@Injectable()
export class GetConversionUseCase {
  constructor(
    @Inject(ANALYTICS_READ_REPOSITORY) private readonly analyticsReadRepository: AnalyticsReadRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GetConversionUseCase.name);
  }

  async execute(userId: string): Promise<Conversion[]> {
    this.logger.debug(`Computing conversion funnel for user=${userId}`);
    const rows = await this.analyticsReadRepository.findApplicationsByUser(userId);

    return foldConversion(rows);
  }
}
