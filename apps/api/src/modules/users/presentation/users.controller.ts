import { Controller, Get, NotFoundException, Param, UseGuards } from "@nestjs/common";
import { RequiereAccion } from "../../../common/decorators/requiere-accion.decorator";
import { PermissionsGuard } from "../../../common/guards/permissions.guard";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { GetUserUseCase } from "../application/use-cases/get-user.use-case";
import { ListUsersUseCase } from "../application/use-cases/list-users.use-case";

/** Administration of ListaUsuarios: only an Administrador holds the `usuario.*` Acciones. */
@Controller("users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(
    private readonly getUserUseCase: GetUserUseCase,
    private readonly listUsersUseCase: ListUsersUseCase,
  ) {}

  @Get()
  @RequiereAccion("usuario.list")
  findAll() {
    return this.listUsersUseCase.execute();
  }

  @Get(":id")
  @RequiereAccion("usuario.view")
  async findOne(@Param("id") id: string) {
    const user = await this.getUserUseCase.execute(id);

    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }
}
