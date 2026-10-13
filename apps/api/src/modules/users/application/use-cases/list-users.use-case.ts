import { Inject, Injectable } from "@nestjs/common";
import type { Usuario as UsuarioModel } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { LISTA_USUARIOS, type ListaUsuarios } from "../../domain/lista-usuarios.repository";

@Injectable()
export class ListUsersUseCase {
  constructor(
    @Inject(LISTA_USUARIOS) private readonly listaUsuarios: ListaUsuarios,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ListUsersUseCase.name);
  }

  async execute(): Promise<UsuarioModel[]> {
    this.logger.debug("Listing users");
    return (await this.listaUsuarios.listar()).map((usuario) => usuario.toModel());
  }
}
