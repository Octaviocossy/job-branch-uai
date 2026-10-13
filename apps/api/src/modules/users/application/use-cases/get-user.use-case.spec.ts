import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { ListaUsuarios } from "../../domain/lista-usuarios.repository";
import { Usuario } from "../../domain/usuario";
import { GetUserUseCase } from "./get-user.use-case";

describe("GetUserUseCase", () => {
  it("returns the usuario's model from the catalog", async () => {
    const usuario = new Usuario("u1", "a@b.com", "A", "hash", "native", 0, "postulante");
    const lista = {
      buscarPorId: vi.fn().mockResolvedValue(usuario),
    } as unknown as ListaUsuarios;
    const logger = {
      setContext: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as AppLogger;
    const useCase = new GetUserUseCase(lista, logger);

    const result = await useCase.execute("u1");

    expect(lista.buscarPorId).toHaveBeenCalledWith("u1");
    expect(result).toEqual({ id: "u1", email: "a@b.com", nombreCompleto: "A", authProvider: "native", intentosFallidos: 0 });
    expect(result).not.toHaveProperty("passwordHash");
  });

  it("returns null when the catalog finds no usuario", async () => {
    const lista = {
      buscarPorId: vi.fn().mockResolvedValue(null),
    } as unknown as ListaUsuarios;
    const logger = {
      setContext: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as AppLogger;
    const useCase = new GetUserUseCase(lista, logger);

    const result = await useCase.execute("missing");

    expect(lista.buscarPorId).toHaveBeenCalledWith("missing");
    expect(result).toBeNull();
  });
});
