import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { User } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import { USER_CREATED_EVENT } from "../../domain/events/user-created.event";
import type { UserRepository } from "../../domain/user.repository";
import { CreateUserUseCase } from "./create-user.use-case";

describe("CreateUserUseCase", () => {
  it("persists the user, emits user.created, and returns the created user", async () => {
    const created: User = { id: "u1", email: "a@b.com", displayName: "A", role: "postulante" };
    const repo = {
      create: vi.fn().mockResolvedValue(created),
      findById: vi.fn(),
      findAll: vi.fn(),
    } as unknown as UserRepository;
    const logger = {
      setContext: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as AppLogger;
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const useCase = new CreateUserUseCase(repo, logger, eventEmitter);

    const result = await useCase.execute({
      email: "a@b.com",
      displayName: "A",
      role: "postulante",
    });

    expect(repo.create).toHaveBeenCalledWith({
      email: "a@b.com",
      displayName: "A",
      role: "postulante",
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith(USER_CREATED_EVENT, {
      user: created,
    });
    expect(result).toEqual(created);
  });
});
