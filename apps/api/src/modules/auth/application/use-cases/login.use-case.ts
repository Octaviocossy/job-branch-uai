import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthResponse, LoginInput } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { LISTA_USUARIOS, type ListaUsuarios } from "../../../users/domain/lista-usuarios.repository";
import { PasswordService } from "../password.service";
import { IniciarSesionUseCase } from "./iniciar-sesion.use-case";

const INVALID_CREDENTIALS_MESSAGE = "Email o contraseña incorrectos";

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(LISTA_USUARIOS) private readonly listaUsuarios: ListaUsuarios,
    private readonly passwordService: PasswordService,
    private readonly logger: AppLogger,
    private readonly iniciarSesionUseCase: IniciarSesionUseCase,
  ) {
    this.logger.setContext(LoginUseCase.name);
  }

  async execute(input: LoginInput): Promise<AuthResponse> {
    this.logger.debug(`Login attempt email=${input.email}`);

    const usuario = await this.listaUsuarios.buscarPorEmail(input.email);

    if (!usuario || !(await usuario.autenticar(input.password, this.passwordService))) {
      if (usuario) {
        usuario.incrementarIntentos();
        await this.listaUsuarios.guardar(usuario);
      }

      this.logger.warn(`Login failed email=${input.email}`);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const role = usuario.obtenerRol();

    if (!role) {
      this.logger.error(`Usuario without Persona id=${usuario.id}`);
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const token = await this.iniciarSesionUseCase.execute(usuario.id, role);

    this.logger.log(`User logged in id=${usuario.id}`);

    return { token, user: usuario.toModel() };
  }
}
