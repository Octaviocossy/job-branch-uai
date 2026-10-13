import { Controller, Get, UseGuards } from "@nestjs/common";
import type { PermissionMatrix, PersonaTipo } from "@repo/models";
import { RequiereAccion } from "../../../common/decorators/requiere-accion.decorator";
import { PermissionsGuard } from "../../../common/guards/permissions.guard";
import { CurrentUser } from "../../../shared/auth/current-user.decorator";
import type { JwtPayload } from "../../../shared/auth/jwt.service";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { ResolverPermisosUseCase } from "../application/use-cases/resolver-permisos.use-case";

@Controller("security")
export class SecurityController {
  constructor(private readonly resolverPermisosUseCase: ResolverPermisosUseCase) {}

  @Get("matrix")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiereAccion("security.viewMatrix")
  matrix(@CurrentUser() user: JwtPayload): PermissionMatrix {
    const role = user.role as PersonaTipo;
    const contexto = this.resolverPermisosUseCase.execute(role);

    return { role, acciones: contexto.listarAcciones() };
  }
}
