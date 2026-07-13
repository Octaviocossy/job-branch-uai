import { Inject, Injectable } from "@nestjs/common";
import type { Application, CreateApplicationInput } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { BRANCH_REPOSITORY, type BranchRepository } from "../../domain/branch.repository";

@Injectable()
export class CreateBranchUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepository: BranchRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(CreateBranchUseCase.name);
  }

  async execute(userId: string, input: CreateApplicationInput): Promise<Application> {
    this.logger.debug(`Creating branch userId=${userId} company=${input.company} role=${input.role}`);
    const branch = await this.branchRepository.create(userId, input);
    this.logger.log(`Branch created id=${branch.id}`);
    return branch;
  }
}
