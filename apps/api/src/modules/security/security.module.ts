import { Global, Module, type OnApplicationBootstrap } from "@nestjs/common";
import { PermissionsGuard } from "../../common/guards/permissions.guard";
import { PersonaModule } from "../persona/persona.module";
import { crearFactories, MATRIZ_PERMISOS_FACTORIES } from "./application/factories/matriz-permisos.factory";
import { ResolverPermisosUseCase } from "./application/use-cases/resolver-permisos.use-case";
import { SincronizarMatrizUseCase } from "./application/use-cases/sincronizar-matriz.use-case";
import { COMPONENTE_PERMISO_REPOSITORY } from "./domain/componente-permiso.repository";
import { DrizzleComponentePermisoRepository } from "./infrastructure/drizzle-componente-permiso.repository";
import { SecurityController } from "./presentation/security.controller";

// @Global so any feature module's controllers can use PermissionsGuard without importing this module.
@Global()
@Module({
  imports: [PersonaModule],
  controllers: [SecurityController],
  providers: [
    ResolverPermisosUseCase,
    SincronizarMatrizUseCase,
    PermissionsGuard,
    { provide: COMPONENTE_PERMISO_REPOSITORY, useClass: DrizzleComponentePermisoRepository },
    { provide: MATRIZ_PERMISOS_FACTORIES, inject: [COMPONENTE_PERMISO_REPOSITORY], useFactory: crearFactories },
  ],
  exports: [ResolverPermisosUseCase, PermissionsGuard, COMPONENTE_PERMISO_REPOSITORY, MATRIZ_PERMISOS_FACTORIES],
})
export class SecurityModule implements OnApplicationBootstrap {
  constructor(private readonly sincronizarMatrizUseCase: SincronizarMatrizUseCase) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.sincronizarMatrizUseCase.execute();
  }
}
