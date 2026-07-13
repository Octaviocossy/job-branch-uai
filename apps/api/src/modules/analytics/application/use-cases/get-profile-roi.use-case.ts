import { Inject, Injectable } from "@nestjs/common";
import type { ProfileRoi } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { ANALYTICS_READ_REPOSITORY, type AnalyticsReadRepository } from "../../domain/analytics-read.repository";
import { foldProfileRoi } from "../analytics.folds";

@Injectable()
export class GetProfileRoiUseCase {
  constructor(
    @Inject(ANALYTICS_READ_REPOSITORY) private readonly analyticsReadRepository: AnalyticsReadRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GetProfileRoiUseCase.name);
  }

  async execute(userId: string): Promise<ProfileRoi[]> {
    this.logger.debug(`Computing profile ROI for user=${userId}`);
    const [rows, cvVersionIds] = await Promise.all([this.analyticsReadRepository.findApplicationsByUser(userId), this.analyticsReadRepository.findCvVersionIdsByUser(userId)]);

    return foldProfileRoi(rows, cvVersionIds);
  }
}
