import { Module } from "@nestjs/common";
import { ArchiveCvVersionUseCase } from "./application/use-cases/archive-cv-version.use-case";
import { CreateCvVersionUseCase } from "./application/use-cases/create-cv-version.use-case";
import { ListCvVersionsUseCase } from "./application/use-cases/list-cv-versions.use-case";
import { SetOutputProfileUseCase } from "./application/use-cases/set-output-profile.use-case";
import { SetSnapshotVacanteUseCase } from "./application/use-cases/set-snapshot-vacante.use-case";
import { UploadCvFileUseCase } from "./application/use-cases/upload-cv-file.use-case";
import { CV_VERSION_REPOSITORY } from "./domain/cv-version.repository";
import { DrizzleCvVersionRepository } from "./infrastructure/drizzle-cv-version.repository";
import { CvVersionsController } from "./presentation/cv-versions.controller";

@Module({
  controllers: [CvVersionsController],
  providers: [
    ListCvVersionsUseCase,
    CreateCvVersionUseCase,
    UploadCvFileUseCase,
    SetOutputProfileUseCase,
    SetSnapshotVacanteUseCase,
    ArchiveCvVersionUseCase,
    { provide: CV_VERSION_REPOSITORY, useClass: DrizzleCvVersionRepository },
  ],
})
export class CvVersionsModule {}
