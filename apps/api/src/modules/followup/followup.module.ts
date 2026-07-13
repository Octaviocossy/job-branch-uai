import { Module } from "@nestjs/common";
import { GenerateRemindersUseCase } from "./application/use-cases/generate-reminders.use-case";
import { ListFollowupsUseCase } from "./application/use-cases/list-followups.use-case";
import { MarkFollowupDoneUseCase } from "./application/use-cases/mark-followup-done.use-case";
import { FOLLOWUP_REPOSITORY } from "./domain/followup.repository";
import { DrizzleFollowupRepository } from "./infrastructure/drizzle-followup.repository";
import { FollowupController } from "./presentation/followup.controller";

@Module({
  controllers: [FollowupController],
  providers: [ListFollowupsUseCase, GenerateRemindersUseCase, MarkFollowupDoneUseCase, { provide: FOLLOWUP_REPOSITORY, useClass: DrizzleFollowupRepository }],
})
export class FollowupModule {}
