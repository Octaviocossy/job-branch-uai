import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { HITO_CREATED_EVENT, type HitoCreatedEvent } from "../../domain/events/hito-created.event";

@Injectable()
export class HitoCreatedListener {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(HitoCreatedListener.name);
  }

  @OnEvent(HITO_CREATED_EVENT)
  handleHitoCreated(event: HitoCreatedEvent): void {
    // Hook for the follow-up module to schedule an anti-ghosting reminder — no-op/log for now.
    this.logger.log(`Handling hito.created branchId=${event.branchId} status=${event.hito.status}`);
  }
}
