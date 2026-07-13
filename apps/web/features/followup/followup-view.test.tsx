import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { FollowupItem, FollowupListResponse } from "@/models";
import { EResult } from "@/models";
import { renderWithClient } from "@/test/test-utils";

vi.mock("@/services/followup.service", () => ({
  followup_service: { list: vi.fn(), markDone: vi.fn() },
}));

import { followup_service } from "@/services/followup.service";
import { FollowupView } from "./followup-view";

const CRITICAL_ITEM: FollowupItem = {
  ramaId: "r1",
  company: "Mercado Libre",
  role: "Senior Frontend Engineer",
  status: "RRHH",
  lastUpdated: "2024-01-01",
  daysSince: 20,
  urgency: "critical",
  recruiter: { name: "Laura García", email: "l.garcia@meli.com" },
};

const OK_ITEM: FollowupItem = {
  ramaId: "r2",
  company: "Globant",
  role: "React Developer",
  status: "Enviado",
  lastUpdated: "2024-01-15",
  daysSince: 2,
  urgency: "ok",
};

const BASE_RESPONSE: FollowupListResponse = {
  items: [CRITICAL_ITEM, OK_ITEM],
  summary: { critical: 1, warn: 0, ok: 1 },
  thresholds: { warn: 7, critical: 15 },
};

const AFTER_DONE_RESPONSE: FollowupListResponse = {
  items: [OK_ITEM],
  summary: { critical: 0, warn: 0, ok: 1 },
  thresholds: { warn: 7, critical: 15 },
};

describe("FollowupView", () => {
  it("groups active branches by urgency, shows the recruiter contact, and removes a row once marked done", async () => {
    const user = userEvent.setup();
    vi.mocked(followup_service.list)
      .mockResolvedValueOnce({ type: EResult.SUCCESS, value: BASE_RESPONSE, status: 200 })
      .mockResolvedValueOnce({ type: EResult.SUCCESS, value: AFTER_DONE_RESPONSE, status: 200 });
    vi.mocked(followup_service.markDone).mockResolvedValue({
      type: EResult.SUCCESS,
      value: { id: "rec-1", ramaId: "r1", fechaVencimiento: "2024-01-21", diasInactividad: 20, estado: "resuelto" },
      status: 200,
    });

    renderWithClient(<FollowupView />);

    expect(await screen.findByText("Mercado Libre")).toBeInTheDocument();
    expect(screen.getByText("Globant")).toBeInTheDocument();
    expect(screen.getByText("Laura García")).toBeInTheDocument();
    expect(screen.getByText("Ghosting crítico")).toBeInTheDocument();

    const [criticalDoneButton] = screen.getAllByRole("button", { name: "Hecho" });
    if (!criticalDoneButton) {
      throw new Error("expected a Hecho button to be rendered");
    }
    await user.click(criticalDoneButton);

    expect(followup_service.markDone).toHaveBeenCalledWith("r1");
    await waitFor(() => {
      expect(screen.queryByText("Mercado Libre")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Globant")).toBeInTheDocument();
  });
});
