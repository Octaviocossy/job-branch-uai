import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { AuthResponse, RegisterInput, User } from "@repo/models";
import { JwtService } from "../../../../shared/auth/jwt.service";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { USER_CREATED_EVENT } from "../../../users/domain/events/user-created.event";
import { USER_REPOSITORY, type UserRepository } from "../../../users/domain/user.repository";
import { PasswordService } from "../password.service";

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly logger: AppLogger,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(RegisterUseCase.name);
  }

  async execute(input: RegisterInput): Promise<AuthResponse> {
    this.logger.debug(`Registering user email=${input.email}`);

    const existing = await this.userRepository.findByEmail(input.email);

    if (existing) {
      this.logger.warn(`Registration rejected, email already in use email=${input.email}`);
      throw new ConflictException("No fue posible completar el registro");
    }

    const passwordHash = await this.passwordService.hash(input.password);
    const created = await this.userRepository.create({
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      passwordHash,
    });
    const user: User = { id: created.id, email: created.email, displayName: created.displayName, role: created.role };

    // Emit AFTER persistence succeeds — never before (see §7).
    this.eventEmitter.emit(USER_CREATED_EVENT, { user });

    const token = this.jwtService.sign({ sub: user.id, role: user.role });

    this.logger.log(`User registered id=${user.id}`);

    return { token, user };
  }
}
