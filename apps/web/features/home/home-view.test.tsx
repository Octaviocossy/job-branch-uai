import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AxiosError } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, EResult } from "@/models";
import { renderWithClient } from "@/test/test-utils";

vi.mock("@/services/health.service", () => ({
  health_service: { get: vi.fn() },
}));

vi.mock("@/services/users.service", () => ({
  users_service: { list: vi.fn(), create: vi.fn() },
}));

import { HomeView } from "@/features/home/home-view";
import { health_service } from "@/services/health.service";
import { users_service } from "@/services/users.service";

function buildApiError(status: number): ApiError {
  const axiosError = {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    config: {},
    response: { status, data: undefined, statusText: "", headers: {} },
  } as unknown as AxiosError;

  return new ApiError(axiosError);
}

describe("HomeView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(users_service.list).mockResolvedValue({
      type: EResult.SUCCESS,
      value: [],
      status: 200,
    });
  });

  it("renders the API health status on the happy path", async () => {
    vi.mocked(health_service.get).mockResolvedValue({
      type: EResult.SUCCESS,
      value: { status: "ok" },
      status: 200,
    });

    renderWithClient(<HomeView />);

    expect(await screen.findByText(/API status:\s*ok/)).toBeInTheDocument();
  });

  it("renders an unreachable status when the health service errors", async () => {
    vi.mocked(health_service.get).mockResolvedValue({
      type: EResult.ERROR,
      value: buildApiError(500),
      status: 500,
    });

    renderWithClient(<HomeView />);

    expect(await screen.findByText(/API status:\s*unreachable/)).toBeInTheDocument();
  });

  it("submits a valid create-user form to the users service", async () => {
    vi.mocked(health_service.get).mockResolvedValue({
      type: EResult.SUCCESS,
      value: { status: "ok" },
      status: 200,
    });
    vi.mocked(users_service.create).mockResolvedValue({
      type: EResult.SUCCESS,
      value: {
        id: "00000000-0000-0000-0000-000000000000",
        email: "ada@example.com",
        displayName: "Ada",
      },
      status: 201,
    });

    const user = userEvent.setup();
    renderWithClient(<HomeView />);

    await user.type(screen.getByPlaceholderText("Email"), "ada@example.com");
    await user.type(screen.getByPlaceholderText("Display name"), "Ada");
    await user.click(screen.getByRole("button", { name: /create user/i }));

    await vi.waitFor(() => {
      expect(users_service.create).toHaveBeenCalledWith({
        email: "ada@example.com",
        displayName: "Ada",
      });
    });
  });

  describe("users card", () => {
    it("shows a loading indicator while users are pending", async () => {
      vi.mocked(health_service.get).mockResolvedValue({
        type: EResult.SUCCESS,
        value: { status: "ok" },
        status: 200,
      });
      vi.mocked(users_service.list).mockReturnValue(new Promise(() => {}));

      renderWithClient(<HomeView />);

      expect(await screen.findByText("Loading…")).toBeInTheDocument();
    });

    it("shows the user-facing error message when the users service errors", async () => {
      vi.mocked(health_service.get).mockResolvedValue({
        type: EResult.SUCCESS,
        value: { status: "ok" },
        status: 200,
      });
      vi.mocked(users_service.list).mockResolvedValue({
        type: EResult.ERROR,
        value: buildApiError(500),
        status: 500,
      });

      renderWithClient(<HomeView />);

      expect(await screen.findByText("Server error. Please try again later.")).toBeInTheDocument();
    });

    it("shows an empty-state message when there are no users", async () => {
      vi.mocked(health_service.get).mockResolvedValue({
        type: EResult.SUCCESS,
        value: { status: "ok" },
        status: 200,
      });

      renderWithClient(<HomeView />);

      expect(await screen.findByText("No users yet.")).toBeInTheDocument();
    });

    it("renders the user list when users are present", async () => {
      vi.mocked(health_service.get).mockResolvedValue({
        type: EResult.SUCCESS,
        value: { status: "ok" },
        status: 200,
      });
      vi.mocked(users_service.list).mockResolvedValue({
        type: EResult.SUCCESS,
        value: [{ id: "00000000-0000-0000-0000-000000000001", email: "ada@example.com", displayName: "Ada" }],
        status: 200,
      });

      renderWithClient(<HomeView />);

      expect(await screen.findByText("Ada")).toBeInTheDocument();
      expect(screen.getByText("ada@example.com")).toBeInTheDocument();
    });
  });

  describe("create-user form", () => {
    it("does not call the service when the form is submitted invalid", async () => {
      vi.mocked(health_service.get).mockResolvedValue({
        type: EResult.SUCCESS,
        value: { status: "ok" },
        status: 200,
      });

      const user = userEvent.setup();
      renderWithClient(<HomeView />);

      await user.click(screen.getByRole("button", { name: /create user/i }));

      await vi.waitFor(() => {
        expect(screen.getByPlaceholderText("Email")).toHaveAttribute("aria-invalid", "true");
      });
      expect(users_service.create).not.toHaveBeenCalled();
    });

    it("shows the form-level error when the create request fails", async () => {
      vi.mocked(health_service.get).mockResolvedValue({
        type: EResult.SUCCESS,
        value: { status: "ok" },
        status: 200,
      });
      vi.mocked(users_service.create).mockResolvedValue({
        type: EResult.ERROR,
        value: buildApiError(500),
        status: 500,
      });

      const user = userEvent.setup();
      renderWithClient(<HomeView />);

      await user.type(screen.getByPlaceholderText("Email"), "ada@example.com");
      await user.type(screen.getByPlaceholderText("Display name"), "Ada");
      await user.click(screen.getByRole("button", { name: /create user/i }));

      expect(await screen.findByText("Server error. Please try again later.")).toBeInTheDocument();
    });
  });
});
