import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { JwtService } from "../../../../shared/auth/jwt.service";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { UserRepository, UserWithPasswordHash } from "../../../users/domain/user.repository";
import type { PasswordService } from "../password.service";
import { LoginUseCase } from "./login.use-case";

const makeLogger = () =>
  ({
    setContext: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }) as unknown as AppLogger;

const makeRepo = (overrides: Partial<UserRepository> = {}) =>
  ({
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findByEmail: vi.fn(),
    incrementFailedAttempts: vi.fn(),
    ...overrides,
  }) as unknown as UserRepository;

const stored: UserWithPasswordHash = { id: "u1", email: "a@b.com", displayName: "A", role: "postulante", passwordHash: "hashed" };

describe("LoginUseCase", () => {
  it("signs a token on a matching password", async () => {
    const repo = makeRepo({ findByEmail: vi.fn().mockResolvedValue(stored) });
    const passwordService = { hash: vi.fn(), compare: vi.fn().mockResolvedValue(true) } as unknown as PasswordService;
    const jwtService = { sign: vi.fn().mockReturnValue("signed.jwt"), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const useCase = new LoginUseCase(repo, passwordService, jwtService, logger);

    const result = await useCase.execute({ email: "a@b.com", password: "supersecret" });

    expect(passwordService.compare).toHaveBeenCalledWith("supersecret", "hashed");
    expect(repo.incrementFailedAttempts).not.toHaveBeenCalled();
    expect(result).toEqual({
      token: "signed.jwt",
      user: { id: "u1", email: "a@b.com", displayName: "A", role: "postulante" },
    });
  });

  it("increments the failed-attempt counter and throws the generic error on a wrong password", async () => {
    const repo = makeRepo({ findByEmail: vi.fn().mockResolvedValue(stored) });
    const passwordService = { hash: vi.fn(), compare: vi.fn().mockResolvedValue(false) } as unknown as PasswordService;
    const jwtService = { sign: vi.fn(), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const useCase = new LoginUseCase(repo, passwordService, jwtService, logger);

    await expect(useCase.execute({ email: "a@b.com", password: "wrong" })).rejects.toThrow(new UnauthorizedException("Email o contraseña incorrectos"));
    expect(repo.incrementFailedAttempts).toHaveBeenCalledWith("u1");
  });

  it("throws the same generic error when the email does not exist, without incrementing any counter", async () => {
    const repo = makeRepo({ findByEmail: vi.fn().mockResolvedValue(null) });
    const passwordService = { hash: vi.fn(), compare: vi.fn() } as unknown as PasswordService;
    const jwtService = { sign: vi.fn(), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const useCase = new LoginUseCase(repo, passwordService, jwtService, logger);

    await expect(useCase.execute({ email: "missing@b.com", password: "whatever" })).rejects.toThrow(
      new UnauthorizedException("Email o contraseña incorrectos"),
    );
    expect(repo.incrementFailedAttempts).not.toHaveBeenCalled();
    expect(passwordService.compare).not.toHaveBeenCalled();
  });
});
