import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Application, ApplicationStatus, CreateHitoInput } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { BRANCH_REPOSITORY, type BranchRepository } from "../../domain/branch.repository";
import { InvalidStatusTransitionError } from "../../domain/errors/invalid-status-transition.error";
import { HITO_CREATED_EVENT } from "../../domain/events/hito-created.event";
import { TERMINAL_STATUSES } from "../../domain/terminal-statuses";

@Injectable()
export class AddHitoUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepository: BranchRepository,
    private readonly logger: AppLogger,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(AddHitoUseCase.name);
  }

  async execute(branchId: string, userId: string, input: CreateHitoInput): Promise<Application | null> {
    const branch = await this.branchRepository.findById(branchId, userId);

    if (!branch) {
      return null;
    }

    this.assertValidTransition(branch.status, input.status);

    const daysInStage = input.daysInStage ?? this.daysSinceLastHito(branch, input.date);
    const result = await this.branchRepository.addHito(branchId, userId, { ...input, daysInStage });

    if (result) {
      // Emit AFTER persistence succeeds — never before (see §7).
      this.eventEmitter.emit(HITO_CREATED_EVENT, { branchId, hito: result.hito });
      this.logger.log(`Hito added branchId=${branchId} status=${input.status}`);
    }

    return result ? result.application : null;
  }

  private assertValidTransition(currentStatus: ApplicationStatus, nextStatus: ApplicationStatus): void {
    if (TERMINAL_STATUSES.includes(currentStatus)) {
      throw new InvalidStatusTransitionError(currentStatus, nextStatus);
    }

    if (nextStatus === "Archivado") {
      throw new InvalidStatusTransitionError(currentStatus, nextStatus);
    }
  }

  private daysSinceLastHito(branch: Application, nextDate: string): number | undefined {
    const lastHito = branch.timeline.at(-1);

    if (!lastHito) {
      return undefined;
    }

    const diffMs = new Date(nextDate).getTime() - new Date(lastHito.date).getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }
}
