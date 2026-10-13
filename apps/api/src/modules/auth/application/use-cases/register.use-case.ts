import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { AuthResponse, RegisterInput } from "@repo/models";
import { JwtService } from "../../../../shared/auth/jwt.service";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { CreatePersonaUseCase } from "../../../persona/application/use-cases/create-persona.use-case";
import { ContextosSeguridadService } from "../../../security/application/contextos-seguridad.service";
import { MATRIZ_PERMISOS_FACTORIES, type MatrizPermisosFactories } from "../../../security/application/factories/matriz-permisos.factory";
import { USER_CREATED_EVENT } from "../../../users/domain/events/user-created.event";
import { LISTA_USUARIOS, type ListaUsuarios } from "../../../users/domain/lista-usuarios.repository";
import { PasswordService } from "../password.service";

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(LISTA_USUARIOS) private readonly listaUsuarios: ListaUsuarios,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly logger: AppLogger,
    private readonly eventEmitter: EventEmitter2,
    private readonly createPersonaUseCase: CreatePersonaUseCase,
    @Inject(MATRIZ_PERMISOS_FACTORIES) private readonly factories: MatrizPermisosFactories,
    private readonly contextos: ContextosSeguridadService,
  ) {
    this.logger.setContext(RegisterUseCase.name);
  }

  async execute(input: RegisterInput): Promise<AuthResponse> {
    this.logger.debug(`Registering user email=${input.email}`);

    const existing = await this.listaUsuarios.buscarPorEmail(input.email);

    if (existing) {
      this.logger.warn(`Registration rejected, email already in use email=${input.email}`);
      throw new ConflictException("No fue posible completar el registro");
    }

    const passwordHash = await this.passwordService.hash(input.password);
    const usuario = await this.listaUsuarios.agregarUsuario({
      email: input.email,
      nombreCompleto: input.nombreCompleto,
      passwordHash,
    });
    const user = usuario.toModel();

    // Emit AFTER persistence succeeds — never before (see §7).
    this.eventEmitter.emit(USER_CREATED_EVENT, { user });

    // The Persona is created holding its role's default roots, in one transaction: it never exists without roots
    // (invariant 12), and when the grant fails no Persona is left behind and no token is signed.
    const raices = this.factories[input.role].raicesPorDefecto();
    const persona =
      input.role === "recruiter"
        ? await this.createPersonaUseCase.execute(
            {
              tipo: "recruiter",
              usuarioId: usuario.id,
              puestoCorporativo: null,
              perNombre: input.nombreCompleto,
              perApellido: "",
              fechaContratacion: new Date().toISOString().slice(0, 10),
            },
            raices,
          )
        : await this.createPersonaUseCase.execute(
            {
              tipo: "postulante",
              usuarioId: usuario.id,
              puestoCorporativo: null,
              habilidadesMaster: [],
            },
            raices,
          );

    const token = this.jwtService.sign({ sub: usuario.id, role: persona.tipo });
    await this.contextos.iniciar(token);

    this.logger.log(`User registered id=${usuario.id}`);

    return { token, user };
  }
}
