import { describe, expect, it, vi } from "vitest";
import type { AppLogger } from "../../../../shared/logger/app.logger";
import { ResolverPermisosUseCase } from "./resolver-permisos.use-case";

function makeLogger(): AppLogger {
  return {
    setContext: vi.fn(),
    log: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  } as unknown as AppLogger;
}

describe("ResolverPermisosUseCase", () => {
  it("resolves the postulante matrix for role postulante", () => {
    const useCase = new ResolverPermisosUseCase(makeLogger());

    const contexto = useCase.execute("postulante");

    expect(contexto.tienePermiso("branch.create")).toBe(true);
    expect(contexto.tienePermiso("board.updateStage")).toBe(false);
  });

  it("resolves the recruiter matrix for role recruiter", () => {
    const useCase = new ResolverPermisosUseCase(makeLogger());

    const contexto = useCase.execute("recruiter");

    expect(contexto.tienePermiso("board.updateStage")).toBe(true);
    expect(contexto.tienePermiso("branch.create")).toBe(false);
  });

  it("sets the logger context to its own class name", () => {
    const logger = makeLogger();

    new ResolverPermisosUseCase(logger);

    expect(logger.setContext).toHaveBeenCalledWith("ResolverPermisosUseCase");
  });
});
