import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { AuthResponse, RegisterInput } from "@repo/models";
import { JwtService } from "../../../../shared/auth/jwt.service";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { CreatePersonaUseCase } from "../../../persona/application/use-cases/create-persona.use-case";
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

    const persona =
      input.role === "recruiter"
        ? await this.createPersonaUseCase.execute({
            tipo: "recruiter",
            usuarioId: usuario.id,
            puestoCorporativo: null,
            perNombre: input.nombreCompleto,
            perApellido: "",
            fechaContratacion: new Date().toISOString().slice(0, 10),
          })
        : await this.createPersonaUseCase.execute({
            tipo: "postulante",
            usuarioId: usuario.id,
            puestoCorporativo: null,
            habilidadesMaster: [],
          });

    // The role's factory hands the new Persona its default roots; its tree is loaded from the database from now on.
    // This is not atomic with the Persona's creation, by design: when it fails the Persona holds no roots, which
    // denies everything, until the next boot's `SincronizarMatrizUseCase` hands it its role's default roots
    // (derived decision 32, invariant 12). No token is signed meanwhile, so nothing runs on the empty tree.
    try {
      await this.factories[persona.tipo].otorgarRaices(persona.id);
    } catch (error) {
      this.logger.error(`Default roots not handed out, the Persona holds none until the next matrix sync personaId=${persona.id}`);
      throw error;
    }

    const token = this.jwtService.sign({ sub: usuario.id, role: persona.tipo });

    this.logger.log(`User registered id=${usuario.id}`);

    return { token, user };
  }
}
