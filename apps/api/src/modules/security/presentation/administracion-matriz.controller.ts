import { BadRequestException, Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import {
  type AsignarRaizInput,
  asignarRaizSchema,
  type CatalogoMatriz,
  type CreateGrupoPermisosInput,
  createGrupoPermisosSchema,
  type GrupoPermisos as GrupoPermisosModel,
  type PersonaRaices,
  type UpdateGrupoPermisosInput,
  updateGrupoPermisosSchema,
} from "@repo/models";
import { RequiereAccion } from "../../../common/decorators/requiere-accion.decorator";
import { PermissionsGuard } from "../../../common/guards/permissions.guard";
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { ActualizarGrupoUseCase } from "../application/use-cases/actualizar-grupo.use-case";
import { AsignarRaizUseCase } from "../application/use-cases/asignar-raiz.use-case";
import { CrearGrupoUseCase } from "../application/use-cases/crear-grupo.use-case";
import { EliminarGrupoUseCase } from "../application/use-cases/eliminar-grupo.use-case";
import { ListarGruposUseCase } from "../application/use-cases/listar-grupos.use-case";
import { ListarPersonasConRaicesUseCase } from "../application/use-cases/listar-personas-con-raices.use-case";
import { ObtenerCatalogoUseCase } from "../application/use-cases/obtener-catalogo.use-case";
import { RemoverRaizUseCase } from "../application/use-cases/remover-raiz.use-case";
import {
  CicloEnMatrizError,
  ComponenteNoEncontradoError,
  GrupoEnUsoComoRaizError,
  NoEsGrupoError,
  PersonaNoEncontradaError,
  RaizNoAsignadaError,
  UltimaRaizError,
} from "../domain/errors/matriz-permisos.errors";

/** Maps a matrix-administration domain error to its HTTP exception; anything else is rethrown. */
function aHttp(error: unknown): never {
  if (error instanceof ComponenteNoEncontradoError || error instanceof PersonaNoEncontradaError || error instanceof RaizNoAsignadaError) {
    throw new NotFoundException(error.message);
  }

  if (error instanceof NoEsGrupoError || error instanceof CicloEnMatrizError) {
    throw new BadRequestException(error.message);
  }

  if (error instanceof UltimaRaizError || error instanceof GrupoEnUsoComoRaizError) {
    throw new ConflictException(error.message);
  }

  throw error;
}

/** CU-15: the Administrador's management of the permission matrix. Every handler carries its own Accion (invariant 10). */
@Controller("security")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdministracionMatrizController {
  constructor(
    private readonly obtenerCatalogoUseCase: ObtenerCatalogoUseCase,
    private readonly listarGruposUseCase: ListarGruposUseCase,
    private readonly crearGrupoUseCase: CrearGrupoUseCase,
    private readonly actualizarGrupoUseCase: ActualizarGrupoUseCase,
    private readonly eliminarGrupoUseCase: EliminarGrupoUseCase,
    private readonly listarPersonasConRaicesUseCase: ListarPersonasConRaicesUseCase,
    private readonly asignarRaizUseCase: AsignarRaizUseCase,
    private readonly removerRaizUseCase: RemoverRaizUseCase,
  ) {}

  @Get("catalog")
  @RequiereAccion("security.viewCatalog")
  catalog(): Promise<CatalogoMatriz> {
    return this.obtenerCatalogoUseCase.execute();
  }

  @Get("groups")
  @RequiereAccion("security.listGroups")
  listGroups(): Promise<GrupoPermisosModel[]> {
    return this.listarGruposUseCase.execute();
  }

  @Post("groups")
  @RequiereAccion("security.createGroup")
  async createGroup(@Body(new ZodValidationPipe(createGrupoPermisosSchema)) body: CreateGrupoPermisosInput): Promise<GrupoPermisosModel> {
    try {
      return await this.crearGrupoUseCase.execute(body);
    } catch (error) {
      return aHttp(error);
    }
  }

  @Patch("groups/:id")
  @RequiereAccion("security.updateGroup")
  async updateGroup(@Param("id", ParseUUIDPipe) id: string, @Body(new ZodValidationPipe(updateGrupoPermisosSchema)) body: UpdateGrupoPermisosInput): Promise<GrupoPermisosModel> {
    try {
      return await this.actualizarGrupoUseCase.execute(id, body);
    } catch (error) {
      return aHttp(error);
    }
  }

  @Delete("groups/:id")
  @HttpCode(204)
  @RequiereAccion("security.deleteGroup")
  async deleteGroup(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    try {
      await this.eliminarGrupoUseCase.execute(id);
    } catch (error) {
      aHttp(error);
    }
  }

  @Get("personas")
  @RequiereAccion("security.listPersonas")
  listPersonas(): Promise<PersonaRaices[]> {
    return this.listarPersonasConRaicesUseCase.execute();
  }

  @Post("personas/:personaId/roots")
  @HttpCode(204)
  @RequiereAccion("security.assignRoot")
  async assignRoot(@Param("personaId", ParseUUIDPipe) personaId: string, @Body(new ZodValidationPipe(asignarRaizSchema)) body: AsignarRaizInput): Promise<void> {
    try {
      await this.asignarRaizUseCase.execute(personaId, body.componenteId);
    } catch (error) {
      aHttp(error);
    }
  }

  @Delete("personas/:personaId/roots/:componenteId")
  @HttpCode(204)
  @RequiereAccion("security.removeRoot")
  async removeRoot(@Param("personaId", ParseUUIDPipe) personaId: string, @Param("componenteId", ParseUUIDPipe) componenteId: string): Promise<void> {
    try {
      await this.removerRaizUseCase.execute(personaId, componenteId);
    } catch (error) {
      aHttp(error);
    }
  }
}
