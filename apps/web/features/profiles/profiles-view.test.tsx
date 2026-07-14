import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EResult } from "@/models";
import { renderWithClient } from "@/test/test-utils";

vi.mock("@/services/cv-versions.service", () => ({
  cv_versions_service: {
    list: vi.fn(),
    create: vi.fn(),
    uploadFile: vi.fn(),
    setOutputProfile: vi.fn(),
    archive: vi.fn(),
  },
}));

import { ProfilesView } from "@/features/profiles/profiles-view";
import { cv_versions_service } from "@/services/cv-versions.service";

const disponible = {
  id: "cv1",
  name: "v1.0 — Fullstack General",
  focus: "General",
  tags: ["fullstack"],
  esPerfilSalida: false,
  estado: "disponible" as const,
  tamanioBytes: 245_760,
  createdAt: "2024-01-10",
  rendimiento: { applications: 4, interviews: 2 },
  snapshotVacanteId: null,
};

const seleccionadoSalida = {
  ...disponible,
  id: "cv2",
  name: "v2.1 — React + TypeScript",
  esPerfilSalida: true,
  estado: "seleccionado_salida" as const,
  rendimiento: { applications: 10, interviews: 8 },
};

describe("ProfilesView", () => {
  beforeEach(() => {
    vi.mocked(cv_versions_service.list).mockReset();
    vi.mocked(cv_versions_service.setOutputProfile).mockReset();
  });

  it("renders the best performer callout and each version's ROI", async () => {
    vi.mocked(cv_versions_service.list).mockResolvedValue({
      type: EResult.SUCCESS,
      value: [disponible, seleccionadoSalida],
      status: 200,
    });

    renderWithClient(<ProfilesView />);

    await waitFor(() => {
      expect(screen.getByText(/Mejor rendimiento/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText("v2.1 — React + TypeScript").length).toBeGreaterThan(0);
    expect(screen.getByText("v1.0 — Fullstack General")).toBeInTheDocument();
  });

  it("shows the API error message when the list request fails", async () => {
    vi.mocked(cv_versions_service.list).mockResolvedValue({
      type: EResult.ERROR,
      value: { getUserMessage: () => "Server error. Please try again later." } as never,
      status: 500,
    });

    renderWithClient(<ProfilesView />);

    await waitFor(() => {
      expect(screen.getByText("Server error. Please try again later.")).toBeInTheDocument();
    });
  });

  it("sets the output profile and invalidates the cv-versions query", async () => {
    vi.mocked(cv_versions_service.list).mockResolvedValue({
      type: EResult.SUCCESS,
      value: [disponible],
      status: 200,
    });
    vi.mocked(cv_versions_service.setOutputProfile).mockResolvedValue({
      type: EResult.SUCCESS,
      value: { ...disponible, esPerfilSalida: true, estado: "seleccionado_salida" },
      status: 200,
    });

    const user = userEvent.setup();
    renderWithClient(<ProfilesView />);

    const button = await screen.findByRole("button", { name: /Establecer como salida/i });
    await user.click(button);

    await waitFor(() => {
      expect(cv_versions_service.setOutputProfile).toHaveBeenCalledWith("cv1");
    });
  });
});
