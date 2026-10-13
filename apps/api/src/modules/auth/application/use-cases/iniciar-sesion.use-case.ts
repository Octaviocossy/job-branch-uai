import { Inject, Injectable } from "@nestjs/common";
import type { PersonaTipo } from "@repo/models";
import { JwtService } from "../../../../shared/auth/jwt.service";
import { hashToken } from "../../../../shared/auth/token-hash";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { ResolverPermisosUseCase } from "../../../security/application/use-cases/resolver-permisos.use-case";
import { SESION_REPOSITORY, type SesionRepository } from "../../domain/sesion.repository";
import { ContextosSesionStore } from "../contextos-sesion.store";

/** SPEC 19.1 "new Sesion" (CU-14) plus CU-15: starts a Sesion for a Usuario and returns the JWT that names it. */
@Injectable()
export class IniciarSesionUseCase {
  constructor(
    @Inject(SESION_REPOSITORY) private readonly sesiones: SesionRepository,
    private readonly jwtService: JwtService,
    private readonly resolverPermisosUseCase: ResolverPermisosUseCase,
    private readonly contextos: ContextosSesionStore,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(IniciarSesionUseCase.name);
  }

  async execute(usuarioId: string, role: PersonaTipo): Promise<string> {
    this.logger.debug(`Starting sesion usuarioId=${usuarioId}`);

    const token = this.jwtService.sign({ sub: usuarioId, role });
    const { exp } = this.jwtService.verify(token);

    if (exp === undefined) {
      throw new Error("Signed token carries no expiry");
    }

    // Resolved before the row exists, so a failure here leaves no live Sesion behind.
    const raiz = await this.resolverPermisosUseCase.execute(usuarioId);
    const fechaExpiracion = new Date(exp * 1000);
    const sesion = await this.sesiones.crear({ usuarioId, tokenJWT: hashToken(token), fechaEmision: new Date(), fechaExpiracion });
    const contexto = sesion.inicializarContextoSeguridad(raiz);

    this.contextos.guardar(sesion.id, contexto, fechaExpiracion);

    this.logger.log(`Sesion started id=${sesion.id} usuarioId=${usuarioId}`);

    return token;
  }
}
