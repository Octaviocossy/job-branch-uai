import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { BRANCH_ARCHIVED_EVENT, type BranchArchivedEvent } from "../../domain/events/branch-archived.event";

@Injectable()
export class BranchArchivedListener {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(BranchArchivedListener.name);
  }

  @OnEvent(BRANCH_ARCHIVED_EVENT)
  handleBranchArchived(event: BranchArchivedEvent): void {
    // Hook for the analytics module to invalidate cached ROI stats — no-op/log for now.
    this.logger.log(`Handling branch.archived id=${event.branch.id}`);
  }
}
