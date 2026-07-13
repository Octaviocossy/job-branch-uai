import { Inject, Injectable } from "@nestjs/common";
import type { CreateFeedbackInput, Feedback } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { BRANCH_REPOSITORY, type BranchRepository } from "../../domain/branch.repository";

@Injectable()
export class AddFeedbackUseCase {
  constructor(
    @Inject(BRANCH_REPOSITORY) private readonly branchRepository: BranchRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(AddFeedbackUseCase.name);
  }

  execute(branchId: string, hitoId: string, userId: string, input: CreateFeedbackInput): Promise<Feedback | null> {
    this.logger.debug(`Adding feedback branchId=${branchId} hitoId=${hitoId} userId=${userId}`);
    return this.branchRepository.addFeedback(branchId, hitoId, userId, input);
  }
}
