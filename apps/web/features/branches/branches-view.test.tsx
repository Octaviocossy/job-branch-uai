import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Application } from "@/models";
import { EResult } from "@/models";
import { renderWithClient } from "@/test/test-utils";

vi.mock("@/services/applications.service", () => ({
  applications_service: { list: vi.fn(), getById: vi.fn(), create: vi.fn(), clone: vi.fn(), archive: vi.fn(), addHito: vi.fn() },
}));

vi.mock("@/services/cv-versions.service", () => ({
  cv_versions_service: { list: vi.fn(), create: vi.fn(), uploadFile: vi.fn(), setOutputProfile: vi.fn(), archive: vi.fn() },
}));

import { BranchesView } from "@/features/branches/branches-view";
import { applications_service } from "@/services/applications.service";
import { cv_versions_service } from "@/services/cv-versions.service";

const MELI: Application = {
  id: "app-1",
  company: "Mercado Libre",
  role: "Senior Frontend Engineer",
  status: "RRHH",
  cvVersion: "v2.1 — React + TypeScript",
  appliedDate: "2024-01-01",
  lastUpdated: "2024-01-02",
  techStack: ["React", "TypeScript"],
  timeline: [],
};

const GLOBANT: Application = {
  id: "app-2",
  company: "Globant",
  role: "React Developer",
  status: "Oferta",
  cvVersion: "v1.0 — General",
  appliedDate: "2024-01-05",
  lastUpdated: "2024-01-10",
  techStack: ["Vue"],
  timeline: [],
};

const ARCHIVED: Application = {
  id: "app-3",
  company: "OldCo",
  role: "Backend Developer",
  status: "Archivado",
  cvVersion: "v1.0 — General",
  appliedDate: "2023-12-01",
  lastUpdated: "2023-12-15",
  techStack: ["Go"],
  archived: true,
  timeline: [],
};

describe("BranchesView", () => {
  beforeEach(() => {
    vi.mocked(applications_service.list).mockReset();
    vi.mocked(applications_service.clone).mockReset();
    vi.mocked(cv_versions_service.list).mockReset();
  });

  it("filters by search text and hides archived branches until toggled", async () => {
    vi.mocked(applications_service.list).mockResolvedValue({
      type: EResult.SUCCESS,
      value: [MELI, GLOBANT, ARCHIVED],
      status: 200,
    });

    const user = userEvent.setup();
    renderWithClient(<BranchesView />);

    expect(await screen.findByText("Mercado Libre")).toBeInTheDocument();
    expect(screen.getByText("Globant")).toBeInTheDocument();
    expect(screen.queryByText("OldCo")).not.toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Buscar empresa, rol, tecnología…");
    await user.click(searchInput);
    await user.paste("Mercado");

    expect(screen.getByText("Mercado Libre")).toBeInTheDocument();
    expect(screen.queryByText("Globant")).not.toBeInTheDocument();

    await user.clear(searchInput);
    await user.click(screen.getByRole("button", { name: /Archivadas/i }));

    expect(await screen.findByText("OldCo")).toBeInTheDocument();
  }, 15000);

  it("clones a branch and invalidates the applications list", async () => {
    vi.mocked(applications_service.list).mockResolvedValue({
      type: EResult.SUCCESS,
      value: [MELI],
      status: 200,
    });
    vi.mocked(applications_service.clone).mockResolvedValue({
      type: EResult.SUCCESS,
      value: { ...MELI, id: "app-1-clone" },
      status: 201,
    });

    const user = userEvent.setup();
    renderWithClient(<BranchesView />);

    await screen.findByText("Mercado Libre");
    await user.click(screen.getByTitle("Clonar rama"));

    await waitFor(() => {
      expect(applications_service.clone).toHaveBeenCalledWith("app-1");
    });
    await waitFor(() => {
      expect(applications_service.list).toHaveBeenCalledTimes(2);
    });
  }, 15000);

  it("opens the Nueva Rama dialog without crashing", async () => {
    vi.mocked(applications_service.list).mockResolvedValue({
      type: EResult.SUCCESS,
      value: [MELI],
      status: 200,
    });
    vi.mocked(cv_versions_service.list).mockResolvedValue({
      type: EResult.SUCCESS,
      value: [],
      status: 200,
    });

    const user = userEvent.setup();
    renderWithClient(<BranchesView />);

    await screen.findByText("Mercado Libre");
    await user.click(screen.getByRole("button", { name: /Nueva Rama/i }));

    // If the techStack default regresses to an array, RHF throws on mount and
    // this assertion never resolves — the dialog title proves it mounted cleanly.
    expect(await screen.findByText("Registra un nuevo proceso de postulación.")).toBeInTheDocument();
    expect(screen.getByLabelText("Stack (separado por coma)")).toBeInTheDocument();
  }, 15000);
});
