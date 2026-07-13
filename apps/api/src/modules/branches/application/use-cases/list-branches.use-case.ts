import { Inject, Injectable } from "@nestjs/common";
import type { Application } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { BRANCH_REPOSITORY, type BranchRepository } from "../../domain/branch.repository";

@Injectable()
export class ListBranchesUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepository: BranchRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ListBranchesUseCase.name);
  }

  execute(userId: string, archived?: boolean): Promise<Application[]> {
    this.logger.debug(`Listing branches userId=${userId} archived=${archived}`);
    return this.branchRepository.findAllByUser(userId, { archived });
  }
}
