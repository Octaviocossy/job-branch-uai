import { Module } from "@nestjs/common";
import { UserCreatedListener } from "./application/listeners/user-created.listener";
import { GetUserUseCase } from "./application/use-cases/get-user.use-case";
import { ListUsersUseCase } from "./application/use-cases/list-users.use-case";
import { LISTA_USUARIOS } from "./domain/lista-usuarios.repository";
import { DrizzleListaUsuarios } from "./infrastructure/drizzle-lista-usuarios.repository";
import { UsersController } from "./presentation/users.controller";

@Module({
  controllers: [UsersController],
  providers: [GetUserUseCase, ListUsersUseCase, UserCreatedListener, { provide: LISTA_USUARIOS, useClass: DrizzleListaUsuarios }],
  exports: [LISTA_USUARIOS, GetUserUseCase],
})
export class UsersModule {}
