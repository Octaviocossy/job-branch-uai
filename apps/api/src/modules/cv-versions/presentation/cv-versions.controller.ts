import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { type CreateCvVersionRequest, createCvVersionRequestSchema } from "@repo/models";
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe";
import { CurrentUser } from "../../../shared/auth/current-user.decorator";
import type { JwtPayload } from "../../../shared/auth/jwt.service";
import { JwtAuthGuard } from "../../../shared/auth/jwt-auth.guard";
import { ArchiveCvVersionUseCase } from "../application/use-cases/archive-cv-version.use-case";
import { CreateCvVersionUseCase } from "../application/use-cases/create-cv-version.use-case";
import { ListCvVersionsUseCase } from "../application/use-cases/list-cv-versions.use-case";
import { SetOutputProfileUseCase } from "../application/use-cases/set-output-profile.use-case";
import { UploadCvFileUseCase } from "../application/use-cases/upload-cv-file.use-case";

@Controller("cv-versions")
@UseGuards(JwtAuthGuard)
export class CvVersionsController {
  constructor(
    private readonly listCvVersionsUseCase: ListCvVersionsUseCase,
    private readonly createCvVersionUseCase: CreateCvVersionUseCase,
    private readonly uploadCvFileUseCase: UploadCvFileUseCase,
    private readonly setOutputProfileUseCase: SetOutputProfileUseCase,
    private readonly archiveCvVersionUseCase: ArchiveCvVersionUseCase,
  ) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.listCvVersionsUseCase.execute(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body(new ZodValidationPipe(createCvVersionRequestSchema)) body: CreateCvVersionRequest) {
    return this.createCvVersionUseCase.execute(user.sub, body);
  }

  @Post(":id/file")
  @UseInterceptors(FileInterceptor("file"))
  uploadFile(@CurrentUser() user: JwtPayload, @Param("id") id: string, @UploadedFile() file: Express.Multer.File) {
    return this.uploadCvFileUseCase.execute(user.sub, id, file);
  }

  @Post(":id/output")
  setOutput(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.setOutputProfileUseCase.execute(user.sub, id);
  }

  @Post(":id/archive")
  archive(@CurrentUser() user: JwtPayload, @Param("id") id: string) {
    return this.archiveCvVersionUseCase.execute(user.sub, id);
  }
}
