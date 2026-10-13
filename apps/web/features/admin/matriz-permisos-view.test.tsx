import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type CatalogoMatriz, EResult, type GrupoPermisos, type PersonaRaices } from "@/models";
import { isolateLocalStorage } from "@/test/isolated-storage";
import { ADMINISTRADOR_CODES, sessionWith } from "@/test/session-fixture";
import { renderWithClient } from "@/test/test-utils";
import { clearAuthToken, setAuthToken } from "@/utilities/auth-token.utility";

vi.mock("@/services/security.service", () => ({
  security_service: {
    catalog: vi.fn(),
    groups: vi.fn(),
    createGroup: vi.fn(),
    updateGroup: vi.fn(),
    deleteGroup: vi.fn(),
    personas: vi.fn(),
    assignRoot: vi.fn(),
    removeRoot: vi.fn(),
  },
}));

vi.mock("@/services/auth.service", () => ({
  auth_service: { me: vi.fn(), login: vi.fn(), register: vi.fn(), logout: vi.fn() },
}));

import { MatrizPermisosView } from "@/features/admin/matriz-permisos-view";
import { auth_service } from "@/services/auth.service";
import { security_service } from "@/services/security.service";

const ID = {
  tablero: "11111111-1111-4111-8111-111111111111",
  seguimiento: "22222222-2222-4222-8222-222222222222",
  branchList: "33333333-3333-4333-8333-333333333333",
  branchCreate: "44444444-4444-4444-8444-444444444444",
  branchView: "55555555-5555-4555-8555-555555555555",
  followupList: "66666666-6666-4666-8666-666666666666",
  ada: "77777777-7777-4777-8777-777777777777",
  grace: "88888888-8888-4888-8888-888888888888",
  modulo: "99999999-9999-4999-8999-999999999999",
  formulario: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  usuarioAda: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  usuarioGrace: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
};

const catalog: CatalogoMatriz = [
  {
    id: ID.modulo,
    nombre: "Ramas",
    formularios: [
      {
        id: ID.formulario,
        nombre: "Tablero de ramas",
        acciones: [
          { id: ID.branchList, codigoAccion: "branch.list", nombre: "Listar ramas", grupo: { id: ID.tablero, nombre: "Tablero" } },
          { id: ID.branchCreate, codigoAccion: "branch.create", nombre: "Crear rama", grupo: null },
          { id: ID.branchView, codigoAccion: "branch.view", nombre: "Ver rama", grupo: null },
        ],
      },
    ],
  },
];

const tablero: GrupoPermisos = {
  id: ID.tablero,
  nombre: "Tablero",
  descripcion: "Ver el tablero de ramas",
  padreId: null,
  hijos: [{ id: ID.branchList, tipo: "accion", nombre: "Listar ramas", codigoAccion: "branch.list" }],
  personasConRaiz: 2,
};

const seguimiento: GrupoPermisos = {
  id: ID.seguimiento,
  nombre: "Seguimiento",
  descripcion: "Follow-up de procesos",
  padreId: null,
  hijos: [{ id: ID.followupList, tipo: "accion", nombre: "Listar follow-ups", codigoAccion: "followup.list" }],
  personasConRaiz: 0,
};

const personas: PersonaRaices[] = [
  {
    personaId: ID.ada,
    tipo: "postulante",
    usuario: { id: ID.usuarioAda, email: "ada@example.com", nombreCompleto: "Ada Lovelace" },
    raices: [{ id: ID.tablero, nombre: "Tablero", tipo: "grupo" }],
  },
  {
    personaId: ID.grace,
    tipo: "recruiter",
    usuario: { id: ID.usuarioGrace, email: "grace@example.com", nombreCompleto: "Grace Hopper" },
    raices: [
      { id: ID.tablero, nombre: "Tablero", tipo: "grupo" },
      { id: ID.seguimiento, nombre: "Seguimiento", tipo: "grupo" },
    ],
  },
];

function signInAs(codes: string[]) {
  vi.mocked(auth_service.me).mockResolvedValue({ type: EResult.SUCCESS, value: sessionWith(codes), status: 200 });
}

function apiError(message: string) {
  return { type: EResult.ERROR, value: { getUserMessage: () => message } as never, status: 409 } as const;
}

describe("MatrizPermisosView", () => {
  isolateLocalStorage();

  beforeEach(() => {
    for (const mock of Object.values(security_service)) {
      vi.mocked(mock).mockReset();
    }
    vi.mocked(auth_service.me).mockReset();

    signInAs(ADMINISTRADOR_CODES);
    vi.mocked(security_service.catalog).mockResolvedValue({ type: EResult.SUCCESS, value: catalog, status: 200 });
    vi.mocked(security_service.groups).mockResolvedValue({ type: EResult.SUCCESS, value: [tablero, seguimiento], status: 200 });
    vi.mocked(security_service.personas).mockResolvedValue({ type: EResult.SUCCESS, value: personas, status: 200 });
    setAuthToken("test-token");
  });

  afterEach(() => {
    clearAuthToken();
  });

  it("renders the groups and the personas from the API", async () => {
    renderWithClient(<MatrizPermisosView />);

    expect(await screen.findByText("Ver el tablero de ramas")).toBeInTheDocument();
    expect(screen.getByText("Follow-up de procesos")).toBeInTheDocument();
    expect(screen.getByText("branch.list")).toBeInTheDocument();
    expect(screen.getByText("En uso por 2 personas")).toBeInTheDocument();
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("grace@example.com")).toBeInTheDocument();
    expect(screen.getByText("Recruiter")).toBeInTheDocument();
    expect(screen.getByText(/Los cambios se aplican en el próximo inicio de sesión/)).toBeInTheDocument();
  });

  it("disables the remove-root button for a persona with a single root", async () => {
    renderWithClient(<MatrizPermisosView />);

    const lastRoot = await screen.findByRole("button", { name: "Quitar raíz Tablero de Ada Lovelace" });

    expect(lastRoot).toBeDisabled();
    expect(lastRoot).toHaveAttribute("title", "Una persona no puede quedar sin raíces");
    expect(screen.getByRole("button", { name: "Quitar raíz Seguimiento de Grace Hopper" })).toBeEnabled();
  });

  it("removes a root from a persona that holds several", async () => {
    vi.mocked(security_service.removeRoot).mockResolvedValue({ type: EResult.SUCCESS, value: undefined, status: 204 });
    const user = userEvent.setup();
    renderWithClient(<MatrizPermisosView />);

    await user.click(await screen.findByRole("button", { name: "Quitar raíz Seguimiento de Grace Hopper" }));

    await waitFor(() => {
      expect(security_service.removeRoot).toHaveBeenCalledWith(ID.grace, ID.seguimiento);
    });
  });

  it("assigns a group the persona does not hold as a root", async () => {
    vi.mocked(security_service.assignRoot).mockResolvedValue({ type: EResult.SUCCESS, value: undefined, status: 204 });
    const user = userEvent.setup();
    renderWithClient(<MatrizPermisosView />);

    const adaRow = (await screen.findByText("Ada Lovelace")).closest("tr") as HTMLElement;
    await user.click(within(adaRow).getByRole("button", { name: "Agregar raíz" }));
    await user.selectOptions(within(adaRow).getByLabelText("Grupo a agregar a Ada Lovelace"), "Seguimiento");
    await user.click(within(adaRow).getByRole("button", { name: "Confirmar" }));

    await waitFor(() => {
      expect(security_service.assignRoot).toHaveBeenCalledWith(ID.ada, ID.seguimiento);
    });
  });

  it("creates a group from the two Acciones checked in the dialog", async () => {
    vi.mocked(security_service.createGroup).mockResolvedValue({ type: EResult.SUCCESS, value: { ...seguimiento, id: ID.modulo }, status: 201 });
    const user = userEvent.setup();
    renderWithClient(<MatrizPermisosView />);

    await user.click(await screen.findByRole("button", { name: /Nuevo grupo/ }));
    await user.type(await screen.findByLabelText("Nombre"), "Operaciones");
    await user.click(await screen.findByRole("checkbox", { name: /Crear rama/ }));
    await user.click(screen.getByRole("checkbox", { name: /Ver rama/ }));
    await user.click(screen.getByRole("button", { name: "Crear grupo" }));

    await waitFor(() => {
      expect(security_service.createGroup).toHaveBeenCalledWith(expect.objectContaining({ nombre: "Operaciones", hijoIds: [ID.branchCreate, ID.branchView] }));
    });
  });

  it("warns before moving an Accion out of the group that holds it", async () => {
    const user = userEvent.setup();
    renderWithClient(<MatrizPermisosView />);

    await user.click(await screen.findByRole("button", { name: /Nuevo grupo/ }));
    await user.click(await screen.findByRole("checkbox", { name: /Listar ramas/ }));

    const warning = await screen.findByRole("status");

    expect(within(warning).getByText("Se moverán desde su grupo actual")).toBeInTheDocument();
    expect(within(warning).getByText("branch.list")).toBeInTheDocument();
  });

  it("does not warn about an Accion that is already in the group being edited", async () => {
    const user = userEvent.setup();
    renderWithClient(<MatrizPermisosView />);

    const tableroCard = (await screen.findByText("Ver el tablero de ramas")).closest("li") as HTMLElement;
    await user.click(within(tableroCard).getByRole("button", { name: /Editar/ }));

    expect(await screen.findByRole("checkbox", { name: /Listar ramas/ })).toBeChecked();
    expect(screen.queryByText("Se moverán desde su grupo actual")).not.toBeInTheDocument();
  });

  it("disables Eliminar for a group a persona holds and enables it for an unheld one", async () => {
    renderWithClient(<MatrizPermisosView />);

    const tableroCard = (await screen.findByText("Ver el tablero de ramas")).closest("li") as HTMLElement;
    const seguimientoCard = screen.getByText("Follow-up de procesos").closest("li") as HTMLElement;

    expect(within(tableroCard).getByRole("button", { name: /Eliminar/ })).toBeDisabled();
    expect(within(seguimientoCard).getByRole("button", { name: /Eliminar/ })).toBeEnabled();
  });

  it("shows the API message when deleting a group is refused", async () => {
    vi.mocked(security_service.deleteGroup).mockResolvedValue(apiError("Invalid request."));
    const user = userEvent.setup();
    renderWithClient(<MatrizPermisosView />);

    const seguimientoCard = (await screen.findByText("Follow-up de procesos")).closest("li") as HTMLElement;
    await user.click(within(seguimientoCard).getByRole("button", { name: /Eliminar/ }));

    expect(await screen.findByText("Invalid request.")).toBeInTheDocument();
    expect(security_service.deleteGroup).toHaveBeenCalledWith(ID.seguimiento);
  });

  it("renders no Eliminar button without security.deleteGroup", async () => {
    signInAs(ADMINISTRADOR_CODES.filter((code) => code !== "security.deleteGroup"));
    renderWithClient(<MatrizPermisosView />);

    expect(await screen.findByRole("button", { name: /Nuevo grupo/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Eliminar/ })).not.toBeInTheDocument();
  });
});
