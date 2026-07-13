import type { Application } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { BranchArchivedEvent } from "../../domain/events/branch-archived.event";
import { BranchArchivedListener } from "./branch-archived.listener";

describe("BranchArchivedListener", () => {
  it("logs when it handles a branch.archived event", () => {
    const logger = { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
    const listener = new BranchArchivedListener(logger);
    const branch = { id: "b1" } as Application;

    listener.handleBranchArchived({ branch } satisfies BranchArchivedEvent);

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("b1"));
  });
});
