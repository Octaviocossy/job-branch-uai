import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { JwtService } from "../../../../shared/auth/jwt.service";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { ListaUsuarios } from "../../../users/domain/lista-usuarios.repository";
import { Usuario } from "../../../users/domain/usuario";
import type { PasswordService } from "../password.service";
import { LoginUseCase } from "./login.use-case";

const makeLogger = () =>
  ({
    setContext: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }) as unknown as AppLogger;

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
  it("signs a token carrying the Persona's tipo as role on a matching password", async () => {
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(makeUsuario()) });
    const passwordService = { hash: vi.fn(), compare: vi.fn().mockResolvedValue(true) } as unknown as PasswordService;
    const jwtService = { sign: vi.fn().mockReturnValue("signed.jwt"), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const useCase = new LoginUseCase(lista, passwordService, jwtService, logger);

    const result = await useCase.execute({ email: "a@b.com", password: "supersecret" });

    expect(passwordService.compare).toHaveBeenCalledWith("supersecret", "hashed");
    expect(lista.guardar).not.toHaveBeenCalled();
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: "u1", role: "postulante" });
    expect(result).toEqual({
      token: "signed.jwt",
      user: { id: "u1", email: "a@b.com", nombreCompleto: "A", authProvider: "native", intentosFallidos: 0 },
    });
  });

  it("increments the failed-attempt counter, persists it through guardar, and throws the generic error on a wrong password", async () => {
    const usuario = makeUsuario();
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(usuario) });
    const passwordService = { hash: vi.fn(), compare: vi.fn().mockResolvedValue(false) } as unknown as PasswordService;
    const jwtService = { sign: vi.fn(), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const useCase = new LoginUseCase(lista, passwordService, jwtService, logger);

    await expect(useCase.execute({ email: "a@b.com", password: "wrong" })).rejects.toThrow(new UnauthorizedException("Email o contraseña incorrectos"));
    expect(usuario.intentosFallidos).toBe(1);
    expect(lista.guardar).toHaveBeenCalledWith(usuario);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  it("counts a failed attempt for a Usuario with no stored hash, without calling compare", async () => {
    const usuario = makeUsuario({ passwordHash: null });
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(usuario) });
    const passwordService = { hash: vi.fn(), compare: vi.fn() } as unknown as PasswordService;
    const jwtService = { sign: vi.fn(), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const useCase = new LoginUseCase(lista, passwordService, jwtService, logger);

    await expect(useCase.execute({ email: "a@b.com", password: "whatever" })).rejects.toThrow(new UnauthorizedException("Email o contraseña incorrectos"));
    expect(usuario.intentosFallidos).toBe(1);
    expect(lista.guardar).toHaveBeenCalledWith(usuario);
    expect(passwordService.compare).not.toHaveBeenCalled();
  });

  it("throws the same generic error when the email does not exist, without incrementing any counter", async () => {
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(null) });
    const passwordService = { hash: vi.fn(), compare: vi.fn() } as unknown as PasswordService;
    const jwtService = { sign: vi.fn(), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const useCase = new LoginUseCase(lista, passwordService, jwtService, logger);

    await expect(useCase.execute({ email: "missing@b.com", password: "whatever" })).rejects.toThrow(new UnauthorizedException("Email o contraseña incorrectos"));
    expect(lista.guardar).not.toHaveBeenCalled();
    expect(passwordService.compare).not.toHaveBeenCalled();
  });

  it("throws the generic error, signing nothing, when the Usuario has no Persona", async () => {
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(makeUsuario({ tipo: null })) });
    const passwordService = { hash: vi.fn(), compare: vi.fn().mockResolvedValue(true) } as unknown as PasswordService;
    const jwtService = { sign: vi.fn(), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const useCase = new LoginUseCase(lista, passwordService, jwtService, logger);

    await expect(useCase.execute({ email: "a@b.com", password: "supersecret" })).rejects.toThrow(new UnauthorizedException("Email o contraseña incorrectos"));
    expect(jwtService.sign).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("u1"));
  });
});
