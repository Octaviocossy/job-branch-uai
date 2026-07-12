import { Inject, Injectable } from "@nestjs/common";
import type { User } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { USER_REPOSITORY, type UserRepository } from "../../domain/user.repository";

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GetUserUseCase.name);
  }

  execute(id: string): Promise<User | null> {
    this.logger.debug(`Fetching user id=${id}`);
    return this.userRepository.findById(id);
  }
}
