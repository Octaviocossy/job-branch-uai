import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CvVersion } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { CV_VERSION_REPOSITORY, type CvVersionRepository } from "../../domain/cv-version.repository";

@Injectable()
export class ArchiveCvVersionUseCase {
  constructor(
    @Inject(CV_VERSION_REPOSITORY) private readonly cvVersionRepository: CvVersionRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ArchiveCvVersionUseCase.name);
  }

  async execute(usuarioId: string, id: string): Promise<CvVersion> {
    const existing = await this.cvVersionRepository.findById(id, usuarioId);

    if (!existing) {
      throw new NotFoundException(`CV version ${id} not found`);
    }

    // BR-8: there is no hard delete — only archive. §7.1: `disponible | seleccionado_salida → archivado`.
    if (existing.estado !== "disponible" && existing.estado !== "seleccionado_salida") {
      throw new BadRequestException("Only an available or output CV version can be archived");
    }

    this.logger.debug(`Archiving cvVersionId=${id}`);
    // BR-10: archiving keeps ROI history — computeRendimiento still reads its applications after this.
    const updated = await this.cvVersionRepository.archive(id, usuarioId);
    const rendimiento = await this.cvVersionRepository.computeRendimiento(id);

    this.logger.log(`CV version archived id=${id}`);

    return { ...updated, rendimiento };
  }
}
