import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Application } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { BRANCH_REPOSITORY, type BranchRepository } from "../../domain/branch.repository";
import { BRANCH_ARCHIVED_EVENT } from "../../domain/events/branch-archived.event";

@Injectable()
export class ArchiveBranchUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepository: BranchRepository,
    private readonly logger: AppLogger,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(ArchiveBranchUseCase.name);
  }

  async execute(id: string, userId: string): Promise<Application | null> {
    this.logger.debug(`Archiving branch id=${id} userId=${userId}`);
    const branch = await this.branchRepository.archive(id, userId);

    if (branch) {
      // Emit AFTER persistence succeeds — never before (see §7).
      this.eventEmitter.emit(BRANCH_ARCHIVED_EVENT, { branch });
      this.logger.log(`Branch archived id=${branch.id}`);
    }

    return branch;
  }
}
