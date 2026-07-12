import type { User } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { UserRepository } from "../../domain/user.repository";
import { GetUserUseCase } from "./get-user.use-case";

describe("GetUserUseCase", () => {
  it("returns the user from the repository", async () => {
    const user: User = { id: "u1", email: "a@b.com", displayName: "A" };
    const repo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(user),
      findAll: vi.fn(),
    } as unknown as UserRepository;
    const logger = {
      setContext: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as AppLogger;
    const useCase = new GetUserUseCase(repo, logger);

    const result = await useCase.execute("u1");

    expect(repo.findById).toHaveBeenCalledWith("u1");
    expect(result).toEqual(user);
  });

  it("returns null when the repository finds no user", async () => {
    const repo = {
      create: vi.fn(),
      findById: vi.fn().mockResolvedValue(null),
      findAll: vi.fn(),
    } as unknown as UserRepository;
    const logger = {
      setContext: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as AppLogger;
    const useCase = new GetUserUseCase(repo, logger);

    const result = await useCase.execute("missing");

    expect(repo.findById).toHaveBeenCalledWith("missing");
    expect(result).toBeNull();
  });
});
