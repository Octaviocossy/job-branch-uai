import type { User } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { UserRepository } from "../../domain/user.repository";
import { ListUsersUseCase } from "./list-users.use-case";

describe("ListUsersUseCase", () => {
  it("returns the list of users from the repository", async () => {
    const user: User = { id: "u1", email: "a@b.com", displayName: "A", role: "postulante" };
    const repo = {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn().mockResolvedValue([user]),
    } as unknown as UserRepository;
    const logger = {
      setContext: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as AppLogger;
    const useCase = new ListUsersUseCase(repo, logger);

    const result = await useCase.execute();

    expect(repo.findAll).toHaveBeenCalled();
    expect(result).toEqual([user]);
  });
});
