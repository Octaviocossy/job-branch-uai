import { Inject, Injectable } from "@nestjs/common";
import type { Usuario as UsuarioModel } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { LISTA_USUARIOS, type ListaUsuarios } from "../../domain/lista-usuarios.repository";

@Injectable()
export class GetUserUseCase {
  constructor(
    @Inject(LISTA_USUARIOS) private readonly listaUsuarios: ListaUsuarios,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(GetUserUseCase.name);
  }

  async execute(id: string): Promise<UsuarioModel | null> {
    this.logger.debug(`Fetching user id=${id}`);
    return (await this.listaUsuarios.buscarPorId(id))?.toModel() ?? null;
  }
}
