import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthResponse, LoginInput, User } from "@repo/models";
import { JwtService } from "../../../../shared/auth/jwt.service";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { USER_REPOSITORY, type UserRepository } from "../../../users/domain/user.repository";
import { PasswordService } from "../password.service";

const INVALID_CREDENTIALS_MESSAGE = "Email o contraseña incorrectos";

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(LoginUseCase.name);
  }

  async execute(input: LoginInput): Promise<AuthResponse> {
    this.logger.debug(`Login attempt email=${input.email}`);

    const stored = await this.userRepository.findByEmail(input.email);

    if (!stored?.passwordHash) {
      if (stored) {
        await this.userRepository.incrementFailedAttempts(stored.id);
      }

      this.logger.warn(`Login failed email=${input.email}`);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordMatches = await this.passwordService.compare(input.password, stored.passwordHash);

    if (!passwordMatches) {
      await this.userRepository.incrementFailedAttempts(stored.id);
      this.logger.warn(`Login failed email=${input.email}`);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const user: User = { id: stored.id, email: stored.email, displayName: stored.displayName, role: stored.role };
    const token = this.jwtService.sign({ sub: user.id, role: user.role });

    this.logger.log(`User logged in id=${user.id}`);

    return { token, user };
  }
}
