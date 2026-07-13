import type { Hito } from "@repo/models";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { HitoCreatedEvent } from "../../domain/events/hito-created.event";
import { HitoCreatedListener } from "./hito-created.listener";

describe("HitoCreatedListener", () => {
  it("logs when it handles a hito.created event", () => {
    const logger = { setContext: vi.fn(), log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() } as unknown as AppLogger;
    const listener = new HitoCreatedListener(logger);
    const hito: Hito = { id: "h1", ramaId: "b1", date: "2024-05-05", status: "RRHH" };

    listener.handleHitoCreated({ branchId: "b1", hito } satisfies HitoCreatedEvent);

    expect(logger.log).toHaveBeenCalledWith(expect.stringContaining("b1"));
  });
});
