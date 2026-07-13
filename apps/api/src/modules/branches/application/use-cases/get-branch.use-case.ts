import { Inject, Injectable } from "@nestjs/common";
import type { Application } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { BRANCH_REPOSITORY, type BranchRepository } from "../../domain/branch.repository";

@Injectable()
export class GetBranchUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepository: BranchRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GetBranchUseCase.name);
  }

  execute(id: string, userId: string): Promise<Application | null> {
    this.logger.debug(`Fetching branch id=${id} userId=${userId}`);
    return this.branchRepository.findById(id, userId);
  }
}
