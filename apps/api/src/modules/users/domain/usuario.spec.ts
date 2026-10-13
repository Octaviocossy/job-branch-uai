import { describe, expect, it, vi } from "vitest";
import type { PasswordHasher } from "./password-hasher";
import { Usuario } from "./usuario";

const makeHasher = (matches: boolean) =>
  ({
    hash: vi.fn(),
    compare: vi.fn().mockResolvedValue(matches),
  }) as unknown as PasswordHasher;

const makeUsuario = (overrides: { passwordHash?: string | null; intentos?: number; tipo?: "postulante" | "recruiter" | null } = {}) =>
  new Usuario(
    "u1",
    "a@b.com",
    "Ada Lovelace",
    overrides.passwordHash === undefined ? "hash" : overrides.passwordHash,
    "native",
    overrides.intentos ?? 0,
    overrides.tipo === undefined ? "postulante" : overrides.tipo,
  );

describe("Usuario", () => {
  it("autenticar is true when the hasher confirms the password against the stored hash", async () => {
    const hasher = makeHasher(true);

    const result = await makeUsuario().autenticar("supersecret", hasher);

    expect(result).toBe(true);
    expect(hasher.compare).toHaveBeenCalledWith("supersecret", "hash");
  });

  it("autenticar is false when the hasher rejects the password", async () => {
    const result = await makeUsuario().autenticar("wrong", makeHasher(false));

    expect(result).toBe(false);
  });

  it("autenticar is false without calling the hasher when there is no stored hash", async () => {
    const hasher = makeHasher(true);

    const result = await makeUsuario({ passwordHash: null }).autenticar("supersecret", hasher);

    expect(result).toBe(false);
    expect(hasher.compare).not.toHaveBeenCalled();
  });

  it("incrementarIntentos adds one to intentosFallidos", () => {
    const usuario = makeUsuario({ intentos: 2 });

    usuario.incrementarIntentos();

    expect(usuario.intentosFallidos).toBe(3);
  });

  it("obtenerRol returns the Persona's tipo", () => {
    expect(makeUsuario({ tipo: "recruiter" }).obtenerRol()).toBe("recruiter");
  });

  it("obtenerRol returns null when the Usuario has no Persona", () => {
    expect(makeUsuario({ tipo: null }).obtenerRol()).toBeNull();
  });

  it("toModel has no passwordHash key and carries the current intentosFallidos", () => {
    const usuario = makeUsuario({ intentos: 1 });
    usuario.incrementarIntentos();

    const model = usuario.toModel();

    expect(model).not.toHaveProperty("passwordHash");
    expect(model).toEqual({ id: "u1", email: "a@b.com", nombreCompleto: "Ada Lovelace", authProvider: "native", intentosFallidos: 2 });
  });
});
