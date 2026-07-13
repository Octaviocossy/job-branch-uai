import { Inject, Injectable } from "@nestjs/common";
import type { Recordatorio } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { FOLLOWUP_REPOSITORY, type FollowupRepository } from "../../domain/followup.repository";
import { calculateDaysSince, todayIsoDate } from "../../domain/followup.utils";

@Injectable()
export class MarkFollowupDoneUseCase {
  constructor(
    @Inject(FOLLOWUP_REPOSITORY) private readonly followupRepository: FollowupRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(MarkFollowupDoneUseCase.name);
  }

  async execute(usuarioId: string, ramaId: string): Promise<Recordatorio | null> {
    this.logger.debug(`Marking followup done rama=${ramaId} user=${usuarioId}`);
    const branch = await this.followupRepository.findBranchById(ramaId);

    if (!branch || branch.usuarioId !== usuarioId) {
      this.logger.warn(`Branch not found or not owned by user rama=${ramaId} user=${usuarioId}`);
      return null;
    }

    const daysSince = calculateDaysSince(branch.lastUpdated);
    const resolved = await this.followupRepository.upsertRecordatorio({
      ramaId,
      fechaVencimiento: todayIsoDate(),
      diasInactividad: daysSince,
      estado: "resuelto",
    });

    this.logger.log(`Resolved reminder rama=${ramaId} user=${usuarioId}`);

    return resolved;
  }
}
