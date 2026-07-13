import { Inject, Injectable } from "@nestjs/common";
import type { Application } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { BRANCH_REPOSITORY, type BranchRepository } from "../../domain/branch.repository";

@Injectable()
export class CloneBranchUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepository: BranchRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(CloneBranchUseCase.name);
  }

  async execute(id: string, userId: string): Promise<Application | null> {
    this.logger.debug(`Cloning branch id=${id} userId=${userId}`);
    const clone = await this.branchRepository.clone(id, userId);

    if (clone) {
      this.logger.log(`Branch cloned sourceId=${id} newId=${clone.id}`);
    }

    return clone;
  }
}
