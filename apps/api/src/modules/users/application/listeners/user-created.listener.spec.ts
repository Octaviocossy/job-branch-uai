import type { User } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { UserCreatedEvent } from "../../domain/events/user-created.event";
import { UserCreatedListener } from "./user-created.listener";

describe("UserCreatedListener", () => {
  it("logs when it handles a user.created event", () => {
    const logger = {
      setContext: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as AppLogger;
    const listener = new UserCreatedListener(logger);
    const user: User = { id: "u1", email: "a@b.com", displayName: "A", role: "postulante" };

    listener.handleUserCreated({ user } satisfies UserCreatedEvent);

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("u1"));
  });
});
