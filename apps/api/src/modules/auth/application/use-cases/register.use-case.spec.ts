import { ConflictException } from "@nestjs/common";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { User } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { JwtService } from "../../../../shared/auth/jwt.service";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import { USER_CREATED_EVENT } from "../../../users/domain/events/user-created.event";
import type { UserRepository } from "../../../users/domain/user.repository";
import type { PasswordService } from "../password.service";
import { RegisterUseCase } from "./register.use-case";

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

describe("RegisterUseCase", () => {
  it("hashes the password, persists the user, emits user.created, and returns a signed token", async () => {
    const created: User = { id: "u1", email: "a@b.com", displayName: "A", role: "postulante" };
    const repo = makeRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(created),
    });
    const passwordService = { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() } as unknown as PasswordService;
    const jwtService = { sign: vi.fn().mockReturnValue("signed.jwt"), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const useCase = new RegisterUseCase(repo, passwordService, jwtService, logger, eventEmitter);

    const result = await useCase.execute({
      email: "a@b.com",
      password: "supersecret",
      displayName: "A",
      role: "postulante",
    });

    expect(repo.findByEmail).toHaveBeenCalledWith("a@b.com");
    expect(passwordService.hash).toHaveBeenCalledWith("supersecret");
    expect(repo.create).toHaveBeenCalledWith({
      email: "a@b.com",
      displayName: "A",
      role: "postulante",
      passwordHash: "hashed",
    });
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: "u1", role: "postulante" });
    expect(eventEmitter.emit).toHaveBeenCalledWith(USER_CREATED_EVENT, { user: created });
    expect(result).toEqual({ token: "signed.jwt", user: created });
  });

  it("throws a generic conflict when the email is already registered", async () => {
    const existing: User = { id: "u1", email: "a@b.com", displayName: "A", role: "postulante" };
    const repo = makeRepo({ findByEmail: vi.fn().mockResolvedValue(existing) });
    const passwordService = { hash: vi.fn(), compare: vi.fn() } as unknown as PasswordService;
    const jwtService = { sign: vi.fn(), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const useCase = new RegisterUseCase(repo, passwordService, jwtService, logger, eventEmitter);

    await expect(useCase.execute({ email: "a@b.com", password: "supersecret", displayName: "A", role: "postulante" })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.create).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
