import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CvVersion } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { CV_VERSION_REPOSITORY, type CvVersionRepository } from "../../domain/cv-version.repository";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

export interface UploadCvFileInput {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

@Injectable()
export class UploadCvFileUseCase {
  constructor(
    @Inject(CV_VERSION_REPOSITORY) private readonly cvVersionRepository: CvVersionRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(UploadCvFileUseCase.name);
  }

  async execute(usuarioId: string, id: string, file: UploadCvFileInput | undefined): Promise<CvVersion> {
    if (!file) {
      throw new BadRequestException("A CV file is required");
    }

    // BR-6: ≤ 10 MB, PDF or DOCX only.
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException("CV file must be 10 MB or smaller");
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException("CV file must be a PDF or DOCX document");
    }

    const existing = await this.cvVersionRepository.findById(id, usuarioId);

    if (!existing) {
      throw new NotFoundException(`CV version ${id} not found`);
    }

    // BR-9: a version can't leave `borrador` without an attached file — once uploaded, promote it.
    const nextEstado = existing.estado === "borrador" ? "disponible" : existing.estado;

    this.logger.debug(`Uploading file for cvVersionId=${id} sizeBytes=${file.size}`);
    const updated = await this.cvVersionRepository.updateFile(id, usuarioId, {
      buffer: file.buffer,
      sizeBytes: file.size,
      estado: nextEstado,
    });
    const rendimiento = await this.cvVersionRepository.computeRendimiento(id);

    this.logger.log(`CV file uploaded id=${id} estado=${nextEstado}`);

    return { ...updated, rendimiento };
  }
}
