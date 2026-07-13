import { Injectable } from "@nestjs/common";
import type { UserRole } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { ContextoSeguridad } from "../../domain/contexto-seguridad";
import { resolverFactory } from "../factories/matriz-permisos.factory";

@Injectable()
export class ResolverPermisosUseCase {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(ResolverPermisosUseCase.name);
  }

  execute(role: UserRole): ContextoSeguridad {
    this.logger.debug(`Resolving permission matrix for role=${role}`);

    const factory = resolverFactory(role);
    const root = factory.crear();

    return new ContextoSeguridad(root);
  }
}
