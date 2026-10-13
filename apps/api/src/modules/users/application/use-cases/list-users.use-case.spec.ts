import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import type { ListaUsuarios } from "../../domain/lista-usuarios.repository";
import { Usuario } from "../../domain/usuario";
import { ListUsersUseCase } from "./list-users.use-case";

describe("ListUsersUseCase", () => {
  it("returns the usuarios' models from the catalog", async () => {
    const usuario = new Usuario("u1", "a@b.com", "A", "hash", "native", 0, "postulante");
    const lista = {
      listar: vi.fn().mockResolvedValue([usuario]),
    } as unknown as ListaUsuarios;
    const logger = {
      setContext: vi.fn(),
      log: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as unknown as AppLogger;
    const useCase = new ListUsersUseCase(lista, logger);

    const result = await useCase.execute();

    expect(lista.listar).toHaveBeenCalled();
    expect(result).toEqual([{ id: "u1", email: "a@b.com", nombreCompleto: "A", authProvider: "native", intentosFallidos: 0 }]);
  });
});
