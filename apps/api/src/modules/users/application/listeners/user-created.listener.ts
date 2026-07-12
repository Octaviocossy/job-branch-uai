import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { USER_CREATED_EVENT, type UserCreatedEvent } from "../../domain/events/user-created.event";

@Injectable()
export class UserCreatedListener {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(UserCreatedListener.name);
  }

  @OnEvent(USER_CREATED_EVENT)
  handleUserCreated(event: UserCreatedEvent): void {
    // Example side-effect: in a real app this might enqueue a welcome email.
    this.logger.log(`Handling user.created id=${event.user.id} email=${event.user.email}`);
  }
}
