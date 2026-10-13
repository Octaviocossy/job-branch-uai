import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EResult } from "@/models";
import { isolateLocalStorage } from "@/test/isolated-storage";
import { ADMINISTRADOR_CODES, ALL_POSTULANTE_CODES, sessionWith } from "@/test/session-fixture";
import { renderWithClient } from "@/test/test-utils";
import { clearAuthToken, getAuthToken, setAuthToken } from "@/utilities/auth-token.utility";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock("@/services/auth.service", () => ({
  auth_service: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

import { Sidebar } from "@/components/sidebar";
import { auth_service } from "@/services/auth.service";

const POSTULANTE_SECTIONS = ["Dashboard", "Ramas", "Analítica", "Follow-up", "Perfiles CV"];

describe("Sidebar", () => {
  isolateLocalStorage();

  beforeEach(() => {
    push.mockReset();
    vi.mocked(auth_service.me).mockReset();
    vi.mocked(auth_service.logout).mockReset();
    vi.mocked(auth_service.logout).mockResolvedValue({ type: EResult.SUCCESS, value: undefined, status: 204 });
    setAuthToken("test-token");
  });

  afterEach(() => {
    clearAuthToken();
  });

  it("shows the five sections and no Administración to a Postulante", async () => {
    vi.mocked(auth_service.me).mockResolvedValue({ type: EResult.SUCCESS, value: sessionWith(ALL_POSTULANTE_CODES), status: 200 });

    renderWithClient(<Sidebar />);

    for (const label of POSTULANTE_SECTIONS) {
      expect(await screen.findByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: "Administración" })).not.toBeInTheDocument();
  });

  it("shows only Administración to an Administrador", async () => {
    vi.mocked(auth_service.me).mockResolvedValue({ type: EResult.SUCCESS, value: sessionWith(ADMINISTRADOR_CODES), status: 200 });

    renderWithClient(<Sidebar />);

    expect(await screen.findByRole("link", { name: "Administración" })).toHaveAttribute("href", "/admin/permisos");
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("renders no section while the session is loading", () => {
    vi.mocked(auth_service.me).mockReturnValue(new Promise(() => {}));

    renderWithClient(<Sidebar />);

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("ends the server-side Sesion, then clears the token and goes to /signin", async () => {
    vi.mocked(auth_service.me).mockResolvedValue({ type: EResult.SUCCESS, value: sessionWith(ALL_POSTULANTE_CODES), status: 200 });

    const user = userEvent.setup();
    renderWithClient(<Sidebar />);

    await user.click(await screen.findByRole("button", { name: /Cerrar sesión/i }));

    expect(auth_service.logout).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/signin");
    });
    expect(getAuthToken()).toBeNull();
  });
});
