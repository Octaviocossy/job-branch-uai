import { Module } from "@nestjs/common";
import { UserCreatedListener } from "./application/listeners/user-created.listener";
import { CreateUserUseCase } from "./application/use-cases/create-user.use-case";
import { GetUserUseCase } from "./application/use-cases/get-user.use-case";
import { ListUsersUseCase } from "./application/use-cases/list-users.use-case";
import { USER_REPOSITORY } from "./domain/user.repository";
import { DrizzleUserRepository } from "./infrastructure/drizzle-user.repository";
import { UsersController } from "./presentation/users.controller";

@Module({
  controllers: [UsersController],
  providers: [CreateUserUseCase, GetUserUseCase, ListUsersUseCase, UserCreatedListener, { provide: USER_REPOSITORY, useClass: DrizzleUserRepository }],
})
export class UsersModule {}
