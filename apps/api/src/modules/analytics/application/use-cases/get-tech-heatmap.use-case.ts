import { Inject, Injectable } from "@nestjs/common";
import type { TechHeatmap } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { ANALYTICS_READ_REPOSITORY, type AnalyticsReadRepository } from "../../domain/analytics-read.repository";
import { foldTechHeatmap } from "../analytics.folds";

@Injectable()
export class GetTechHeatmapUseCase {
  constructor(
    @Inject(ANALYTICS_READ_REPOSITORY) private readonly analyticsReadRepository: AnalyticsReadRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GetTechHeatmapUseCase.name);
  }

  async execute(userId: string): Promise<TechHeatmap[]> {
    this.logger.debug(`Computing tech heatmap for user=${userId}`);
    const rows = await this.analyticsReadRepository.findApplicationsByUser(userId);

    return foldTechHeatmap(rows);
  }
}
