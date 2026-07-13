import { Inject, Injectable } from "@nestjs/common";
import type { FollowupThresholds } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { FOLLOWUP_REPOSITORY, type FollowupRepository } from "../../domain/followup.repository";
import { calculateDaysSince, todayIsoDate } from "../../domain/followup.utils";

@Injectable()
export class GenerateRemindersUseCase {
  constructor(
    @Inject(FOLLOWUP_REPOSITORY) private readonly followupRepository: FollowupRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GenerateRemindersUseCase.name);
  }

  async execute(usuarioId: string, thresholds: FollowupThresholds): Promise<void> {
    this.logger.debug(`Generating reminders for user=${usuarioId}`);
    const branches = await this.followupRepository.findActiveBranches(usuarioId);
    let refreshed = 0;

    for (const branch of branches) {
      const daysSince = calculateDaysSince(branch.lastUpdated);

      if (daysSince < thresholds.warn) {
        continue;
      }

      const existing = await this.followupRepository.findRecordatorioByRamaId(branch.ramaId);

      if (existing && (existing.estado !== "resuelto" || existing.diasInactividad >= daysSince)) {
        continue;
      }

      await this.followupRepository.upsertRecordatorio({
        ramaId: branch.ramaId,
        fechaVencimiento: todayIsoDate(),
        diasInactividad: daysSince,
        estado: "pendiente",
      });
      refreshed += 1;
    }

    this.logger.log(`Refreshed ${refreshed} reminder(s) for user=${usuarioId}`);
  }
}
