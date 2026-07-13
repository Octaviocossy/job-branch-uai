import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Application } from "@/models";
import { EResult } from "@/models";
import { renderWithClient } from "@/test/test-utils";

vi.mock("@/services/applications.service", () => ({
  applications_service: { list: vi.fn(), getById: vi.fn(), create: vi.fn(), clone: vi.fn(), archive: vi.fn(), addHito: vi.fn() },
}));

import { DashboardView } from "@/features/dashboard/dashboard-view";
import { applications_service } from "@/services/applications.service";

const OLD_DATE = "2000-01-01";

const ENVIADO: Application = {
  id: "app-1",
  company: "Mercado Libre",
  role: "Senior Frontend Engineer",
  status: "Enviado",
  cvVersion: "v1.0 — General",
  appliedDate: OLD_DATE,
  lastUpdated: OLD_DATE,
  techStack: ["React"],
  timeline: [],
};

const ENTREVISTA: Application = {
  id: "app-2",
  company: "Globant",
  role: "React Developer",
  status: "Entrevista Técnica",
  cvVersion: "v1.0 — General",
  appliedDate: OLD_DATE,
  lastUpdated: new Date().toISOString().slice(0, 10),
  techStack: ["React"],
  timeline: [],
};

const OFERTA: Application = {
  id: "app-3",
  company: "Deel",
  role: "Backend Developer",
  status: "Oferta",
  cvVersion: "v1.0 — General",
  appliedDate: OLD_DATE,
  lastUpdated: new Date().toISOString().slice(0, 10),
  techStack: ["Go"],
  timeline: [],
};

const ARCHIVED: Application = {
  id: "app-4",
  company: "OldCo",
  role: "Backend Developer",
  status: "Archivado",
  cvVersion: "v1.0 — General",
  appliedDate: OLD_DATE,
  lastUpdated: OLD_DATE,
  techStack: ["Go"],
  archived: true,
  timeline: [],
};

describe("DashboardView", () => {
  it("derives KPI counts (active, offers, ghosting risk) from the applications list", async () => {
    vi.mocked(applications_service.list).mockResolvedValue({
      type: EResult.SUCCESS,
      value: [ENVIADO, ENTREVISTA, OFERTA, ARCHIVED],
      status: 200,
    });

    renderWithClient(<DashboardView />);

    await waitFor(() => {
      expect(screen.getByText("Procesos Activos")).toBeInTheDocument();
    });

    expect(screen.getByText("3")).toBeInTheDocument();

    const offersCard = screen.getByText("Ofertas Recibidas").closest("div")?.parentElement;
    expect(offersCard).toHaveTextContent("1");

    const ghostingCard = screen.getByText("Riesgo Ghosting").closest("div")?.parentElement;
    expect(ghostingCard).toHaveTextContent("1");

    expect(screen.getByText("Alertas Anti-Ghosting")).toBeInTheDocument();
    expect(screen.getByText("Mercado Libre", { selector: "span" })).toBeInTheDocument();
  });
});
