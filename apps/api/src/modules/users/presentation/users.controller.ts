import { Body, Controller, Get, NotFoundException, Param, Post } from "@nestjs/common";
import { type CreateUserInput, createUserSchema } from "@repo/models";
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe";
import { CreateUserUseCase } from "../application/use-cases/create-user.use-case";
import { GetUserUseCase } from "../application/use-cases/get-user.use-case";
import { ListUsersUseCase } from "../application/use-cases/list-users.use-case";

@Controller("users")
export class UsersController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
  ) {}

  @Post()
  create(@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput) {
    return this.createUserUseCase.execute(body);
  }

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
