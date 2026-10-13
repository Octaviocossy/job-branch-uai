import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { GetUserUseCase } from "../application/use-cases/get-user.use-case";
import { ListUsersUseCase } from "../application/use-cases/list-users.use-case";

@Controller("users")
export class UsersController {
  constructor(
    private readonly getUserUseCase: GetUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
  ) {}

  @Get()
  findAll() {
    return this.listUsersUseCase.execute();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const user = await this.getUserUseCase.execute(id);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }
}
