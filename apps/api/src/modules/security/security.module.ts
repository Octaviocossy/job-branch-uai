import { Module } from "@nestjs/common";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { ResolverPermisosUseCase } from "./application/use-cases/resolver-permisos.use-case";
import { SecurityController } from "./presentation/security.controller";

@Module({
  controllers: [SecurityController],
  providers: [ResolverPermisosUseCase, PermissionsGuard],
  exports: [ResolverPermisosUseCase, PermissionsGuard],
})
export class SecurityModule {}
