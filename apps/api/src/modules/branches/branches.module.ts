import { Module } from "@nestjs/common";
import { BranchArchivedListener } from "./application/listeners/branch-archived.listener";
import { HitoCreatedListener } from "./application/listeners/hito-created.listener";
import { AddFeedbackUseCase } from "./application/use-cases/add-feedback.use-case";
import { AddHitoUseCase } from "./application/use-cases/add-hito.use-case";
import { ArchiveBranchUseCase } from "./application/use-cases/archive-branch.use-case";
import { CloneBranchUseCase } from "./application/use-cases/clone-branch.use-case";
import { CreateBranchUseCase } from "./application/use-cases/create-branch.use-case";
import { GetBranchUseCase } from "./application/use-cases/get-branch.use-case";
import { ListBranchesUseCase } from "./application/use-cases/list-branches.use-case";
import { BRANCH_REPOSITORY } from "./domain/branch.repository";
import { DrizzleBranchRepository } from "./infrastructure/drizzle-branch.repository";
import { BranchesController } from "./presentation/branches.controller";

@Module({
  controllers: [BranchesController],
  providers: [
    ListBranchesUseCase,
    GetBranchUseCase,
    CreateBranchUseCase,
    CloneBranchUseCase,
    ArchiveBranchUseCase,
    AddHitoUseCase,
    AddFeedbackUseCase,
    HitoCreatedListener,
    BranchArchivedListener,
    { provide: BRANCH_REPOSITORY, useClass: DrizzleBranchRepository },
  ],
})
export class BranchesModule {}
