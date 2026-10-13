import { Injectable } from "@nestjs/common";
import { type JwtPayload, JwtService } from "../../../shared/auth/jwt.service";
import { ContextoSeguridad } from "../domain/contexto-seguridad";
import { ResolverPermisosUseCase } from "./use-cases/resolver-permisos.use-case";

interface ContextoVigente {
  contexto: ContextoSeguridad;
  /** Epoch seconds: the token's `exp`. */
  expiraEn: number;
}

/**
 * Holds one ContextoSeguridad per login (invariant 13): built when the token is issued, reused until it expires, so a
 * grant change reaches a Usuario at its next login. A token is the login — two logins in the same second sign the same
 * token, and so share a tree. One instance serves every module's guard.
 *
 * In-memory stand-in for the Sesion, which will own and initialize the context. A token this process never started
 * (issued before a restart) gets its context on first use instead.
 */
@Injectable()
export class ContextosSeguridadService {
  private readonly vigentes = new Map<string, ContextoVigente>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly resolverPermisosUseCase: ResolverPermisosUseCase,
  ) {}

  /** Session start: builds the context of a freshly issued token. */
  async iniciar(token: string): Promise<void> {
    await this.construir(this.jwtService.verify(token));
  }

  async obtener(login: JwtPayload): Promise<ContextoSeguridad> {
    const vigencia = vigenciaDe(login);
    const vigente = vigencia ? this.vigentes.get(vigencia.clave) : undefined;

    if (vigente && vigente.expiraEn > ahora()) {
      return vigente.contexto;
    }

    return this.construir(login);
  }

  private async construir(login: JwtPayload): Promise<ContextoSeguridad> {
    const contexto = new ContextoSeguridad(await this.resolverPermisosUseCase.execute(login.sub));
    const vigencia = vigenciaDe(login);

    if (vigencia) {
      this.descartarVencidos();
      this.vigentes.set(vigencia.clave, { contexto, expiraEn: vigencia.expiraEn });
    }

    return contexto;
  }

  private descartarVencidos(): void {
    const ahoraEnSegundos = ahora();

    for (const [clave, { expiraEn }] of this.vigentes) {
      if (expiraEn <= ahoraEnSegundos) {
        this.vigentes.delete(clave);
      }
    }
  }
}

/** The identity of a login is its token's `sub` and `iat`; a payload without them has none, and is never kept. */
function vigenciaDe(login: JwtPayload): { clave: string; expiraEn: number } | undefined {
  return login.iat !== undefined && login.exp !== undefined ? { clave: `${login.sub}:${login.iat}`, expiraEn: login.exp } : undefined;
}

function ahora(): number {
  return Date.now() / 1000;
}
