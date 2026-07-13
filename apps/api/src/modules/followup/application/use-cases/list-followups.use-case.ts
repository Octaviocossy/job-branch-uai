import { Inject, Injectable } from "@nestjs/common";
import type { FollowupItem, FollowupListResponse, FollowupThresholds } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { FOLLOWUP_REPOSITORY, type FollowupRepository } from "../../domain/followup.repository";
import { calculateDaysSince, calculateUrgency } from "../../domain/followup.utils";
import { GenerateRemindersUseCase } from "./generate-reminders.use-case";

@Injectable()
export class ListFollowupsUseCase {
  constructor(
    @Inject(FOLLOWUP_REPOSITORY) private readonly followupRepository: FollowupRepository,
    private readonly generateRemindersUseCase: GenerateRemindersUseCase,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ListFollowupsUseCase.name);
  }

  async execute(usuarioId: string, thresholds: FollowupThresholds): Promise<FollowupListResponse> {
    this.logger.debug(`Listing followups for user=${usuarioId}`);
    await this.generateRemindersUseCase.execute(usuarioId, thresholds);

    const branches = await this.followupRepository.findActiveBranches(usuarioId);
    const items: FollowupItem[] = [];

    for (const branch of branches) {
      const daysSince = calculateDaysSince(branch.lastUpdated);
      const recordatorio = await this.followupRepository.findRecordatorioByRamaId(branch.ramaId);

      if (recordatorio?.estado === "resuelto" && recordatorio.diasInactividad >= daysSince) {
        continue;
      }

      items.push({
        ramaId: branch.ramaId,
        company: branch.company,
        role: branch.role,
        status: branch.status,
        lastUpdated: branch.lastUpdated,
        daysSince,
        urgency: calculateUrgency(daysSince, thresholds),
        recruiter: branch.recruiter,
      });
    }

    items.sort((a, b) => b.daysSince - a.daysSince);

    const summary = {
      critical: items.filter((item) => item.urgency === "critical").length,
      warn: items.filter((item) => item.urgency === "warn").length,
      ok: items.filter((item) => item.urgency === "ok").length,
    };

    this.logger.log(`Listed ${items.length} active followup(s) for user=${usuarioId}`);

    return { items, summary, thresholds };
  }
}
