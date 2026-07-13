import { Inject, Injectable } from "@nestjs/common";
import type { CreateCvVersionRequest, CvVersion } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { CV_VERSION_REPOSITORY, type CvVersionRepository } from "../../domain/cv-version.repository";

@Injectable()
export class CreateCvVersionUseCase {
  constructor(
    @Inject(CV_VERSION_REPOSITORY) private readonly cvVersionRepository: CvVersionRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(CreateCvVersionUseCase.name);
  }

  async execute(usuarioId: string, input: CreateCvVersionRequest): Promise<CvVersion> {
    this.logger.debug(`Creating cv version usuarioId=${usuarioId} name=${input.name}`);

    // BR-7: an explicit override wins; otherwise inherit tags from the current output
    // profile (falling back to the first existing version) so a new draft isn't blank.
    let tags = input.tags;

    if (!tags || tags.length === 0) {
      const existing = await this.cvVersionRepository.findAllByUser(usuarioId);
      const base = existing.find((version) => version.esPerfilSalida) ?? existing[0];
      tags = base?.tags ?? [];
    }

    const created = await this.cvVersionRepository.create({ usuarioId, name: input.name, focus: input.focus, tags });
    const rendimiento = await this.cvVersionRepository.computeRendimiento(created.id);

    this.logger.log(`Cv version created id=${created.id}`);

    return { ...created, rendimiento };
  }
}
