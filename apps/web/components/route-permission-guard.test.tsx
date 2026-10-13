import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EResult } from "@/models";
import { isolateLocalStorage } from "@/test/isolated-storage";
import { ADMINISTRADOR_CODES, ALL_POSTULANTE_CODES, sessionWith } from "@/test/session-fixture";
import { renderWithClient } from "@/test/test-utils";
import { clearAuthToken, setAuthToken } from "@/utilities/auth-token.utility";

const navigation = vi.hoisted(() => ({ pathname: "/", replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: vi.fn(), replace: navigation.replace }),
}));

vi.mock("@/services/auth.service", () => ({
  auth_service: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

import { RoutePermissionGuard } from "@/components/route-permission-guard";
import { auth_service } from "@/services/auth.service";

describe("RoutePermissionGuard", () => {
  isolateLocalStorage();

  beforeEach(() => {
    navigation.pathname = "/";
    navigation.replace.mockReset();
    vi.mocked(auth_service.me).mockReset();
    setAuthToken("test-token");
  });

  afterEach(() => {
    clearAuthToken();
  });

  it("renders the children of a route the Persona may open", async () => {
    vi.mocked(auth_service.me).mockResolvedValue({ type: EResult.SUCCESS, value: sessionWith(ALL_POSTULANTE_CODES), status: 200 });

    renderWithClient(
      <RoutePermissionGuard>
        <p>Dashboard content</p>
      </RoutePermissionGuard>,
    );

    expect(await screen.findByText("Dashboard content")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("sends an Administrador from the dashboard to the permissions screen without rendering the children", async () => {
    vi.mocked(auth_service.me).mockResolvedValue({ type: EResult.SUCCESS, value: sessionWith(ADMINISTRADOR_CODES), status: 200 });

    renderWithClient(
      <RoutePermissionGuard>
        <p>Dashboard content</p>
      </RoutePermissionGuard>,
    );

    await waitFor(() => {
      expect(navigation.replace).toHaveBeenCalledWith("/admin/permisos");
    });
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });

  it("renders the children of a route outside the map", async () => {
    navigation.pathname = "/signin";
    vi.mocked(auth_service.me).mockResolvedValue({ type: EResult.SUCCESS, value: sessionWith(ADMINISTRADOR_CODES), status: 200 });

    renderWithClient(
      <RoutePermissionGuard>
        <p>Sign in content</p>
      </RoutePermissionGuard>,
    );

    expect(await screen.findByText("Sign in content")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });

  it("does not redirect when the session failed to load", async () => {
    vi.mocked(auth_service.me).mockResolvedValue({
      type: EResult.ERROR,
      value: { getUserMessage: () => "Server error. Please try again later." } as never,
      status: 500,
    });

    renderWithClient(
      <RoutePermissionGuard>
        <p>Dashboard content</p>
      </RoutePermissionGuard>,
    );

    expect(await screen.findByText("Dashboard content")).toBeInTheDocument();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
});
