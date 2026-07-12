import { Inject, Injectable } from "@nestjs/common";
import type { User } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { USER_REPOSITORY, type UserRepository } from "../../domain/user.repository";

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ListUsersUseCase.name);
  }

  execute(): Promise<User[]> {
    this.logger.debug("Listing users");
    return this.userRepository.findAll();
  }
}
