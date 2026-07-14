import { ConflictException } from "@nestjs/common";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Persona, User } from "@repo/models";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JwtService } from "../../../../shared/auth/jwt.service";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { CreatePersonaUseCase } from "../../../persona/application/use-cases/create-persona.use-case";
import { USER_CREATED_EVENT } from "../../../users/domain/events/user-created.event";
import type { UserRepository } from "../../../users/domain/user.repository";
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

const makeRepo = (overrides: Partial<UserRepository> = {}) =>
  ({
    create: vi.fn(),
    findById: vi.fn(),
    findAll: vi.fn(),
    findByEmail: vi.fn(),
    incrementFailedAttempts: vi.fn(),
    ...overrides,
  }) as unknown as UserRepository;

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

  it("hashes the password, persists the user, emits user.created, creates a postulante persona, and returns a signed token", async () => {
    const created: User = { id: "u1", email: "a@b.com", displayName: "A", role: "postulante" };
    const repo = makeRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(created),
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
    const useCase = new RegisterUseCase(repo, passwordService, jwtService, logger, eventEmitter, createPersonaUseCase);

    const result = await useCase.execute({
      email: "a@b.com",
      password: "supersecret",
      displayName: "A",
      role: "postulante",
    });

    expect(repo.findByEmail).toHaveBeenCalledWith("a@b.com");
    expect(passwordService.hash).toHaveBeenCalledWith("supersecret");
    expect(repo.create).toHaveBeenCalledWith({
      email: "a@b.com",
      displayName: "A",
      role: "postulante",
      passwordHash: "hashed",
    });
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: "u1", role: "postulante" });
    expect(eventEmitter.emit).toHaveBeenCalledWith(USER_CREATED_EVENT, { user: created });
    expect(createPersonaUseCase.execute).toHaveBeenCalledTimes(1);
    expect(createPersonaUseCase.execute).toHaveBeenCalledWith({
      tipo: "postulante",
      usuarioId: "u1",
      puestoCorporativo: null,
      habilidadesMaster: [],
    });
    expect(result).toEqual({ token: "signed.jwt", user: created });
  });

  it("creates a recruiter persona defaulted from the registered user for the recruiter role", async () => {
    const created: User = { id: "u2", email: "r@b.com", displayName: "Rita", role: "recruiter" };
    const repo = makeRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(created),
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
    const useCase = new RegisterUseCase(repo, passwordService, jwtService, logger, eventEmitter, createPersonaUseCase);

    await useCase.execute({
      email: "r@b.com",
      password: "supersecret",
      displayName: "Rita",
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
  });

  it("throws a generic conflict when the email is already registered", async () => {
    const existing: User = { id: "u1", email: "a@b.com", displayName: "A", role: "postulante" };
    const repo = makeRepo({ findByEmail: vi.fn().mockResolvedValue(existing) });
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
    const useCase = new RegisterUseCase(repo, passwordService, jwtService, logger, eventEmitter, createPersonaUseCase);

    await expect(useCase.execute({ email: "a@b.com", password: "supersecret", displayName: "A", role: "postulante" })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repo.create).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
    expect(createPersonaUseCase.execute).not.toHaveBeenCalled();
  });
});
