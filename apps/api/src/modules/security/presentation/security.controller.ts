import { Controller, Get, UseGuards } from "@nestjs/common";
import type { PermissionMatrix, PersonaTipo } from "@repo/models";
import { ContextoActual } from "../../../common/decorators/contexto-actual.decorator";
import { RequiereAccion } from "../../../common/decorators/requiere-accion.decorator";
import { PermissionsGuard } from "../../../common/guards/permissions.guard";
import { CurrentUser } from "../../../shared/auth/current-user.decorator";
import type { JwtPayload } from "../../../shared/auth/jwt.service";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import type { ContextoSeguridad } from "../domain/contexto-seguridad";

@Controller("security")
export class SecurityController {
  @Get("matrix")
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequiereAccion("security.viewMatrix")
  matrix(@CurrentUser() user: JwtPayload, @ContextoActual() contexto: ContextoSeguridad): PermissionMatrix {
    return { role: user.role as PersonaTipo, acciones: contexto.listarAcciones() };
  }
}
