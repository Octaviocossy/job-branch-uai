import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { ListaUsuarios } from "../../../users/domain/lista-usuarios.repository";
import { Usuario } from "../../../users/domain/usuario";
import type { PasswordService } from "../password.service";
import type { IniciarSesionUseCase } from "./iniciar-sesion.use-case";
import { LoginUseCase } from "./login.use-case";

const makeLogger = () =>
  ({
    setContext: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }) as unknown as AppLogger;

const makeIniciarSesion = (token = "signed.jwt") => ({ execute: vi.fn().mockResolvedValue(token) }) as unknown as IniciarSesionUseCase;

const makeLista = (overrides: Partial<ListaUsuarios> = {}) =>
  ({
    agregarUsuario: vi.fn(),
    buscarPorEmail: vi.fn(),
    buscarPorId: vi.fn(),
    listar: vi.fn(),
    guardar: vi.fn(),
    ...overrides,
  }) as unknown as ListaUsuarios;

const makeUsuario = (overrides: { passwordHash?: string | null; tipo?: "postulante" | "recruiter" | null } = {}) =>
  new Usuario(
    "u1",
    "a@b.com",
    "A",
    overrides.passwordHash === undefined ? "hashed" : overrides.passwordHash,
    "native",
    0,
    overrides.tipo === undefined ? "postulante" : overrides.tipo,
  );

describe("LoginUseCase", () => {
  it("starts a Sesion for the Persona's tipo as role on a matching password, and returns the token it issued", async () => {
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(makeUsuario()) });
    const passwordService = { hash: vi.fn(), compare: vi.fn().mockResolvedValue(true) } as unknown as PasswordService;
    const logger = makeLogger();
    const iniciarSesion = makeIniciarSesion();
    const useCase = new LoginUseCase(lista, passwordService, logger, iniciarSesion);

    const result = await useCase.execute({ email: "a@b.com", password: "supersecret" });

    expect(passwordService.compare).toHaveBeenCalledWith("supersecret", "hashed");
    expect(lista.guardar).not.toHaveBeenCalled();
    expect(iniciarSesion.execute).toHaveBeenCalledExactlyOnceWith("u1", "postulante");
    expect(result).toEqual({
      token: "signed.jwt",
      user: { id: "u1", email: "a@b.com", nombreCompleto: "A", authProvider: "native", intentosFallidos: 0 },
    });
  });

  it("increments the failed-attempt counter, persists it through guardar, starts no Sesion, and throws the generic error on a wrong password", async () => {
    const usuario = makeUsuario();
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(usuario) });
    const passwordService = { hash: vi.fn(), compare: vi.fn().mockResolvedValue(false) } as unknown as PasswordService;
    const logger = makeLogger();
    const iniciarSesion = makeIniciarSesion();
    const useCase = new LoginUseCase(lista, passwordService, logger, iniciarSesion);

    await expect(useCase.execute({ email: "a@b.com", password: "wrong" })).rejects.toThrow(new UnauthorizedException("Email o contraseña incorrectos"));
    expect(usuario.intentosFallidos).toBe(1);
    expect(lista.guardar).toHaveBeenCalledWith(usuario);
    expect(iniciarSesion.execute).not.toHaveBeenCalled();
  });

  it("counts a failed attempt for a Usuario with no stored hash, without calling compare", async () => {
    const usuario = makeUsuario({ passwordHash: null });
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(usuario) });
    const passwordService = { hash: vi.fn(), compare: vi.fn() } as unknown as PasswordService;
    const logger = makeLogger();
    const iniciarSesion = makeIniciarSesion();
    const useCase = new LoginUseCase(lista, passwordService, logger, iniciarSesion);

    await expect(useCase.execute({ email: "a@b.com", password: "whatever" })).rejects.toThrow(new UnauthorizedException("Email o contraseña incorrectos"));
    expect(usuario.intentosFallidos).toBe(1);
    expect(lista.guardar).toHaveBeenCalledWith(usuario);
    expect(passwordService.compare).not.toHaveBeenCalled();
  });

  it("throws the same generic error when the email does not exist, without incrementing any counter", async () => {
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(null) });
    const passwordService = { hash: vi.fn(), compare: vi.fn() } as unknown as PasswordService;
    const logger = makeLogger();
    const iniciarSesion = makeIniciarSesion();
    const useCase = new LoginUseCase(lista, passwordService, logger, iniciarSesion);

    await expect(useCase.execute({ email: "missing@b.com", password: "whatever" })).rejects.toThrow(new UnauthorizedException("Email o contraseña incorrectos"));
    expect(lista.guardar).not.toHaveBeenCalled();
    expect(passwordService.compare).not.toHaveBeenCalled();
  });

  it("throws the generic error, starting no Sesion, when the Usuario has no Persona", async () => {
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(makeUsuario({ tipo: null })) });
    const passwordService = { hash: vi.fn(), compare: vi.fn().mockResolvedValue(true) } as unknown as PasswordService;
    const logger = makeLogger();
    const iniciarSesion = makeIniciarSesion();
    const useCase = new LoginUseCase(lista, passwordService, logger, iniciarSesion);

    await expect(useCase.execute({ email: "a@b.com", password: "supersecret" })).rejects.toThrow(new UnauthorizedException("Email o contraseña incorrectos"));
    expect(iniciarSesion.execute).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("u1"));
  });

  it("fails the login, returning no token, when the Sesion cannot be started", async () => {
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(makeUsuario()) });
    const passwordService = { hash: vi.fn(), compare: vi.fn().mockResolvedValue(true) } as unknown as PasswordService;
    const iniciarSesion = { execute: vi.fn().mockRejectedValue(new Error("db down")) } as unknown as IniciarSesionUseCase;
    const useCase = new LoginUseCase(lista, passwordService, makeLogger(), iniciarSesion);

    await expect(useCase.execute({ email: "a@b.com", password: "supersecret" })).rejects.toThrow("db down");
  });
});
