import { Inject, Injectable } from "@nestjs/common";
import type { SkillGap } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { ANALYTICS_READ_REPOSITORY, type AnalyticsReadRepository } from "../../domain/analytics-read.repository";
import { foldSkillGaps } from "../analytics.folds";

@Injectable()
export class GetSkillGapsUseCase {
  constructor(
    @Inject(ANALYTICS_READ_REPOSITORY) private readonly analyticsReadRepository: AnalyticsReadRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GetSkillGapsUseCase.name);
  }

  async execute(userId: string): Promise<SkillGap[]> {
    this.logger.debug(`Computing skill gaps for user=${userId}`);
    const rows = await this.analyticsReadRepository.findApplicationsByUser(userId);

    return foldSkillGaps(rows);
  }
}
