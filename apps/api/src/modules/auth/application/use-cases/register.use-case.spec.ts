import { ConflictException } from "@nestjs/common";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Persona } from "@repo/models";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JwtService } from "../../../../shared/auth/jwt.service";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { CreatePersonaUseCase } from "../../../persona/application/use-cases/create-persona.use-case";
import { USER_CREATED_EVENT } from "../../../users/domain/events/user-created.event";
import type { ListaUsuarios } from "../../../users/domain/lista-usuarios.repository";
import { Usuario } from "../../../users/domain/usuario";
import type { PasswordService } from "../password.service";
import { RegisterUseCase } from "./register.use-case";

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

const makeCreatePersonaUseCase = (created: Persona) =>
  ({
    execute: vi.fn().mockResolvedValue(created),
  }) as unknown as CreatePersonaUseCase;

describe("RegisterUseCase", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hashes the password, persists the usuario, emits user.created, creates a postulante persona, and returns a signed token", async () => {
    const created = new Usuario("u1", "a@b.com", "A", "hashed", "native", 0, null);
    const lista = makeLista({
      buscarPorEmail: vi.fn().mockResolvedValue(null),
      agregarUsuario: vi.fn().mockResolvedValue(created),
    });
    const passwordService = { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() } as unknown as PasswordService;
    const jwtService = { sign: vi.fn().mockReturnValue("signed.jwt"), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const createPersonaUseCase = makeCreatePersonaUseCase({
      id: "p1",
      usuarioId: "u1",
      puestoCorporativo: null,
      tipo: "postulante",
      habilidadesMaster: [],
    });
    const useCase = new RegisterUseCase(lista, passwordService, jwtService, logger, eventEmitter, createPersonaUseCase);

    const result = await useCase.execute({
      email: "a@b.com",
      password: "supersecret",
      nombreCompleto: "A",
      role: "postulante",
    });
    const user = { id: "u1", email: "a@b.com", nombreCompleto: "A", authProvider: "native", intentosFallidos: 0 };

    expect(lista.buscarPorEmail).toHaveBeenCalledWith("a@b.com");
    expect(passwordService.hash).toHaveBeenCalledWith("supersecret");
    expect(lista.agregarUsuario).toHaveBeenCalledWith({
      email: "a@b.com",
      nombreCompleto: "A",
      passwordHash: "hashed",
    });
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: "u1", role: "postulante" });
    expect(eventEmitter.emit).toHaveBeenCalledWith(USER_CREATED_EVENT, { user });
    expect(createPersonaUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createPersonaUseCase.execute).toHaveBeenCalledWith({
      tipo: "postulante",
      usuarioId: "u1",
      puestoCorporativo: null,
      habilidadesMaster: [],
    });
    expect(result).toEqual({ token: "signed.jwt", user });
  });

  it("creates a recruiter persona defaulted from the registered nombreCompleto and signs its tipo as role", async () => {
    const created = new Usuario("u2", "r@b.com", "Rita", "hashed", "native", 0, null);
    const lista = makeLista({
      buscarPorEmail: vi.fn().mockResolvedValue(null),
      agregarUsuario: vi.fn().mockResolvedValue(created),
    });
    const passwordService = { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() } as unknown as PasswordService;
    const jwtService = { sign: vi.fn().mockReturnValue("signed.jwt"), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const createPersonaUseCase = makeCreatePersonaUseCase({
      id: "p2",
      usuarioId: "u2",
      puestoCorporativo: null,
      tipo: "recruiter",
      perNombre: "Rita",
      perApellido: "",
      fechaContratacion: "2026-07-13",
    });
    const useCase = new RegisterUseCase(lista, passwordService, jwtService, logger, eventEmitter, createPersonaUseCase);

    await useCase.execute({
      email: "r@b.com",
      password: "supersecret",
      nombreCompleto: "Rita",
      role: "recruiter",
    });

    expect(createPersonaUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createPersonaUseCase.execute).toHaveBeenCalledWith({
      tipo: "recruiter",
      usuarioId: "u2",
      puestoCorporativo: null,
      perNombre: "Rita",
      perApellido: "",
      fechaContratacion: "2026-07-13",
    });
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: "u2", role: "recruiter" });
  });

  it("throws a generic conflict when the email is already registered", async () => {
    const existing = new Usuario("u1", "a@b.com", "A", "hashed", "native", 0, "postulante");
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(existing) });
    const passwordService = { hash: vi.fn(), compare: vi.fn() } as unknown as PasswordService;
    const jwtService = { sign: vi.fn(), verify: vi.fn() } as unknown as JwtService;
    const logger = makeLogger();
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const createPersonaUseCase = makeCreatePersonaUseCase({
      id: "p1",
      usuarioId: "u1",
      puestoCorporativo: null,
      tipo: "postulante",
      habilidadesMaster: [],
    });
    const useCase = new RegisterUseCase(lista, passwordService, jwtService, logger, eventEmitter, createPersonaUseCase);

    await expect(useCase.execute({ email: "a@b.com", password: "supersecret", nombreCompleto: "A", role: "postulante" })).rejects.toBeInstanceOf(ConflictException);
    expect(lista.agregarUsuario).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(createPersonaUseCase.execute).not.toHaveBeenCalled();
  });
});
