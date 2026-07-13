import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CvVersion } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { CV_VERSION_REPOSITORY, type CvVersionRepository } from "../../domain/cv-version.repository";

@Injectable()
export class SetOutputProfileUseCase {
  constructor(
    @Inject(CV_VERSION_REPOSITORY) private readonly cvVersionRepository: CvVersionRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SetOutputProfileUseCase.name);
  }

  async execute(usuarioId: string, id: string): Promise<CvVersion> {
    const existing = await this.cvVersionRepository.findById(id, usuarioId);

    if (!existing) {
      throw new NotFoundException(`CV version ${id} not found`);
    }

    // §7.1: only `disponible ⇄ seleccionado_salida` — a draft or archived version can't become the output profile.
    if (existing.estado !== "disponible" && existing.estado !== "seleccionado_salida") {
      throw new BadRequestException("Only an available CV version can become the output profile");
    }

    this.logger.debug(`Setting output profile cvVersionId=${id}`);
    // BR-5: demoting any current output profile happens atomically inside the repository.
    const updated = await this.cvVersionRepository.setOutputProfile(id, usuarioId);
    const rendimiento = await this.cvVersionRepository.computeRendimiento(id);

    this.logger.log(`Output profile set id=${id}`);

    return { ...updated, rendimiento };
  }
}
