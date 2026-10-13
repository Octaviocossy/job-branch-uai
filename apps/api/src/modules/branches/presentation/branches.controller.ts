import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from "@nestjs/common";
import { type CreateApplicationInput, type CreateFeedbackInput, type CreateHitoInput, createApplicationSchema, createFeedbackSchema, createHitoSchema } from "@repo/models";
import { RequiereAccion } from "../../../common/decorators/requiere-accion.decorator";
import { PermissionsGuard } from "../../../common/guards/permissions.guard";
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe";
import { CurrentUser } from "../../../shared/auth/current-user.decorator";
import type { JwtPayload } from "../../../shared/auth/jwt.service";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { AddFeedbackUseCase } from "../application/use-cases/add-feedback.use-case";
import { AddHitoUseCase } from "../application/use-cases/add-hito.use-case";
import { ArchiveBranchUseCase } from "../application/use-cases/archive-branch.use-case";
import { CloneBranchUseCase } from "../application/use-cases/clone-branch.use-case";
import { CreateBranchUseCase } from "../application/use-cases/create-branch.use-case";
import { GetBranchUseCase } from "../application/use-cases/get-branch.use-case";
import { ListBranchesUseCase } from "../application/use-cases/list-branches.use-case";
import { CvVersionNotFoundError } from "../domain/errors/cv-version-not-found.error";
import { InvalidStatusTransitionError } from "../domain/errors/invalid-status-transition.error";

function parseArchived(value?: string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value === "true";
}

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("branches")
export class BranchesController {
  constructor(
    private readonly listBranchesUseCase: ListBranchesUseCase,
    private readonly getBranchUseCase: GetBranchUseCase,
    private readonly createBranchUseCase: CreateBranchUseCase,
    private readonly cloneBranchUseCase: CloneBranchUseCase,
    private readonly archiveBranchUseCase: ArchiveBranchUseCase,
    private readonly addHitoUseCase: AddHitoUseCase,
    private readonly addFeedbackUseCase: AddFeedbackUseCase,
  ) {}

  @Get()
  @RequiereAccion("branch.list")
  findAll(@CurrentUser() user: JwtPayload, @Query("archived") archived?: string) {
    return this.listBranchesUseCase.execute(user.sub, parseArchived(archived));
  }

  @Get(":id")
  @RequiereAccion("branch.view")
  async findOne(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const branch = await this.getBranchUseCase.execute(id, user.sub);

    if (!branch) {
      throw new NotFoundException(`Branch ${id} not found`);
    }

    return branch;
  }

  @Post()
  @RequiereAccion("branch.create")
  async create(@CurrentUser() user: JwtPayload, @Body(new ZodValidationPipe(createApplicationSchema)) body: CreateApplicationInput) {
    try {
      return await this.createBranchUseCase.execute(user.sub, body);
    } catch (error) {
      if (error instanceof CvVersionNotFoundError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Post(":id/clone")
  @RequiereAccion("branch.clone")
  async clone(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const branch = await this.cloneBranchUseCase.execute(id, user.sub);

    if (!branch) {
      throw new NotFoundException(`Branch ${id} not found`);
    }

    return branch;
  }

  @Post(":id/archive")
  @RequiereAccion("branch.archive")
  async archive(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    const branch = await this.archiveBranchUseCase.execute(id, user.sub);

    if (!branch) {
      throw new NotFoundException(`Branch ${id} not found`);
    }

    return branch;
  }

  @Post(":id/hitos")
  @RequiereAccion("branch.addHito")
  async addHito(@CurrentUser() user: JwtPayload, @Param("id") id: string, @Body(new ZodValidationPipe(createHitoSchema)) body: CreateHitoInput) {
    try {
      const branch = await this.addHitoUseCase.execute(id, user.sub, body);

      if (!branch) {
        throw new NotFoundException(`Branch ${id} not found`);
      }

      return branch;
    } catch (error) {
      if (error instanceof InvalidStatusTransitionError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  @Post(":id/hitos/:hitoId/feedback")
  @RequiereAccion("branch.addFeedback")
  async addFeedback(
    @CurrentUser() user: JwtPayload,
    @Param("id") id: string,
    @Param("hitoId") hitoId: string,
    @Body(new ZodValidationPipe(createFeedbackSchema)) body: CreateFeedbackInput,
  ) {
    const feedback = await this.addFeedbackUseCase.execute(id, hitoId, user.sub, body);

    if (!feedback) {
      throw new NotFoundException(`Hito ${hitoId} not found on branch ${id}`);
    }

    return feedback;
  }
}
