import { ConflictException } from "@nestjs/common";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Persona } from "@repo/models";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { CreatePersonaUseCase } from "../../../persona/application/use-cases/create-persona.use-case";
import type { MatrizPermisosFactories } from "../../../security/application/factories/matriz-permisos.factory";
import { USER_CREATED_EVENT } from "../../../users/domain/events/user-created.event";
import type { ListaUsuarios } from "../../../users/domain/lista-usuarios.repository";
import { Usuario } from "../../../users/domain/usuario";
import type { PasswordService } from "../password.service";
import type { IniciarSesionUseCase } from "./iniciar-sesion.use-case";
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

const RAICES = { postulante: ["root-postulante"], recruiter: ["root-recruiter"], administrador: ["root-administrador"] };

const makeIniciarSesion = (token = "signed.jwt") => ({ execute: vi.fn().mockResolvedValue(token) }) as unknown as IniciarSesionUseCase;

const makeFactories = () =>
  ({
    postulante: { raicesPorDefecto: vi.fn().mockReturnValue(RAICES.postulante) },
    recruiter: { raicesPorDefecto: vi.fn().mockReturnValue(RAICES.recruiter) },
    administrador: { raicesPorDefecto: vi.fn().mockReturnValue(RAICES.administrador) },
  }) as unknown as MatrizPermisosFactories;

describe("RegisterUseCase", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hashes the password, persists the usuario, emits user.created, creates a postulante persona, starts a Sesion, and returns its token", async () => {
    const created = new Usuario("u1", "a@b.com", "A", "hashed", "native", 0, null);
    const lista = makeLista({
      buscarPorEmail: vi.fn().mockResolvedValue(null),
      agregarUsuario: vi.fn().mockResolvedValue(created),
    });
    const passwordService = { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() } as unknown as PasswordService;
    const logger = makeLogger();
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const createPersonaUseCase = makeCreatePersonaUseCase({
      id: "p1",
      usuarioId: "u1",
      puestoCorporativo: null,
      tipo: "postulante",
      habilidadesMaster: [],
    });
    const factories = makeFactories();
    const iniciarSesion = makeIniciarSesion();
    const useCase = new RegisterUseCase(lista, passwordService, logger, eventEmitter, createPersonaUseCase, factories, iniciarSesion);

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
    expect(eventEmitter.emit).toHaveBeenCalledWith(USER_CREATED_EVENT, { user });
    expect(createPersonaUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createPersonaUseCase.execute).toHaveBeenCalledWith(
      {
        tipo: "postulante",
        usuarioId: "u1",
        puestoCorporativo: null,
        habilidadesMaster: [],
      },
      RAICES.postulante,
    );
    expect(iniciarSesion.execute).toHaveBeenCalledExactlyOnceWith("u1", "postulante");
    expect(result).toEqual({ token: "signed.jwt", user });
  });

  it("creates the Persona holding its role's default roots in that one call, and no other role's", async () => {
    const created = new Usuario("u1", "a@b.com", "A", "hashed", "native", 0, null);
    const lista = makeLista({
      buscarPorEmail: vi.fn().mockResolvedValue(null),
      agregarUsuario: vi.fn().mockResolvedValue(created),
    });
    const passwordService = { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() } as unknown as PasswordService;
    const createPersonaUseCase = makeCreatePersonaUseCase({ id: "p1", usuarioId: "u1", puestoCorporativo: null, tipo: "postulante", habilidadesMaster: [] });
    const factories = makeFactories();
    const useCase = new RegisterUseCase(lista, passwordService, makeLogger(), { emit: vi.fn() } as unknown as EventEmitter2, createPersonaUseCase, factories, makeIniciarSesion());

    await useCase.execute({ email: "a@b.com", password: "supersecret", nombreCompleto: "A", role: "postulante" });

    expect(createPersonaUseCase.execute).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ tipo: "postulante" }), RAICES.postulante);
    expect(factories.recruiter.raicesPorDefecto).not.toHaveBeenCalled();
    expect(factories.administrador.raicesPorDefecto).not.toHaveBeenCalled();
  });

  it("starts no Sesion when the Persona and its roots cannot be created", async () => {
    const created = new Usuario("u1", "a@b.com", "A", "hashed", "native", 0, null);
    const lista = makeLista({
      buscarPorEmail: vi.fn().mockResolvedValue(null),
      agregarUsuario: vi.fn().mockResolvedValue(created),
    });
    const passwordService = { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() } as unknown as PasswordService;
    const createPersonaUseCase = { execute: vi.fn().mockRejectedValue(new Error("grant failed")) } as unknown as CreatePersonaUseCase;
    const iniciarSesion = makeIniciarSesion();
    const useCase = new RegisterUseCase(lista, passwordService, makeLogger(), { emit: vi.fn() } as unknown as EventEmitter2, createPersonaUseCase, makeFactories(), iniciarSesion);

    await expect(useCase.execute({ email: "a@b.com", password: "supersecret", nombreCompleto: "A", role: "postulante" })).rejects.toThrow("grant failed");
    expect(iniciarSesion.execute).not.toHaveBeenCalled();
  });

  it("creates a recruiter persona defaulted from the registered nombreCompleto and starts its Sesion with that tipo as role", async () => {
    const created = new Usuario("u2", "r@b.com", "Rita", "hashed", "native", 0, null);
    const lista = makeLista({
      buscarPorEmail: vi.fn().mockResolvedValue(null),
      agregarUsuario: vi.fn().mockResolvedValue(created),
    });
    const passwordService = { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() } as unknown as PasswordService;
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
    const factories = makeFactories();
    const iniciarSesion = makeIniciarSesion();
    const useCase = new RegisterUseCase(lista, passwordService, logger, eventEmitter, createPersonaUseCase, factories, iniciarSesion);

    await useCase.execute({
      email: "r@b.com",
      password: "supersecret",
      nombreCompleto: "Rita",
      role: "recruiter",
    });

    expect(createPersonaUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createPersonaUseCase.execute).toHaveBeenCalledWith(
      {
        tipo: "recruiter",
        usuarioId: "u2",
        puestoCorporativo: null,
        perNombre: "Rita",
        perApellido: "",
        fechaContratacion: "2026-07-13",
      },
      RAICES.recruiter,
    );
    expect(iniciarSesion.execute).toHaveBeenCalledExactlyOnceWith("u2", "recruiter");
  });

  it("throws a generic conflict when the email is already registered", async () => {
    const existing = new Usuario("u1", "a@b.com", "A", "hashed", "native", 0, "postulante");
    const lista = makeLista({ buscarPorEmail: vi.fn().mockResolvedValue(existing) });
    const passwordService = { hash: vi.fn(), compare: vi.fn() } as unknown as PasswordService;
    const logger = makeLogger();
    const eventEmitter = { emit: vi.fn() } as unknown as EventEmitter2;
    const createPersonaUseCase = makeCreatePersonaUseCase({
      id: "p1",
      usuarioId: "u1",
      puestoCorporativo: null,
      tipo: "postulante",
      habilidadesMaster: [],
    });
    const factories = makeFactories();
    const iniciarSesion = makeIniciarSesion();
    const useCase = new RegisterUseCase(lista, passwordService, logger, eventEmitter, createPersonaUseCase, factories, iniciarSesion);

    await expect(useCase.execute({ email: "a@b.com", password: "supersecret", nombreCompleto: "A", role: "postulante" })).rejects.toBeInstanceOf(ConflictException);
    expect(lista.agregarUsuario).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(createPersonaUseCase.execute).not.toHaveBeenCalled();
    expect(iniciarSesion.execute).not.toHaveBeenCalled();
  });

  it("starts the Sesion only after the Persona and its roots exist, so its context is resolved from them", async () => {
    const created = new Usuario("u1", "a@b.com", "A", "hashed", "native", 0, null);
    const lista = makeLista({
      buscarPorEmail: vi.fn().mockResolvedValue(null),
      agregarUsuario: vi.fn().mockResolvedValue(created),
    });
    const passwordService = { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() } as unknown as PasswordService;
    const createPersonaUseCase = makeCreatePersonaUseCase({ id: "p1", usuarioId: "u1", puestoCorporativo: null, tipo: "postulante", habilidadesMaster: [] });
    const iniciarSesion = makeIniciarSesion();
    const useCase = new RegisterUseCase(lista, passwordService, makeLogger(), { emit: vi.fn() } as unknown as EventEmitter2, createPersonaUseCase, makeFactories(), iniciarSesion);

    await useCase.execute({ email: "a@b.com", password: "supersecret", nombreCompleto: "A", role: "postulante" });

    expect(vi.mocked(createPersonaUseCase.execute).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(iniciarSesion.execute).mock.invocationCallOrder[0] as number);
  });

  it("fails the registration, returning no token, when the Sesion cannot be started", async () => {
    const created = new Usuario("u1", "a@b.com", "A", "hashed", "native", 0, null);
    const lista = makeLista({
      buscarPorEmail: vi.fn().mockResolvedValue(null),
      agregarUsuario: vi.fn().mockResolvedValue(created),
    });
    const passwordService = { hash: vi.fn().mockResolvedValue("hashed"), compare: vi.fn() } as unknown as PasswordService;
    const createPersonaUseCase = makeCreatePersonaUseCase({ id: "p1", usuarioId: "u1", puestoCorporativo: null, tipo: "postulante", habilidadesMaster: [] });
    const iniciarSesion = { execute: vi.fn().mockRejectedValue(new Error("db down")) } as unknown as IniciarSesionUseCase;
    const useCase = new RegisterUseCase(lista, passwordService, makeLogger(), { emit: vi.fn() } as unknown as EventEmitter2, createPersonaUseCase, makeFactories(), iniciarSesion);

    await expect(useCase.execute({ email: "a@b.com", password: "supersecret", nombreCompleto: "A", role: "postulante" })).rejects.toThrow("db down");
  });
});
