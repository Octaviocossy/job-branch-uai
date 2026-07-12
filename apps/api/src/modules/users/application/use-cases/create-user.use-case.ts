import { Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { CreateUserInput, User } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { USER_CREATED_EVENT } from "../../domain/events/user-created.event";
import { USER_REPOSITORY, type UserRepository } from "../../domain/user.repository";

@Injectable()
export class CreateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly logger: AppLogger,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(CreateUserUseCase.name);
  }

  async execute(input: CreateUserInput): Promise<User> {
    this.logger.debug(`Creating user email=${input.email}`);
    const user = await this.userRepository.create(input);
    // Emit AFTER persistence succeeds — never before (see §7).
    this.eventEmitter.emit(USER_CREATED_EVENT, { user });
    this.logger.log(`User created id=${user.id}`);
    return user;
  }
}
