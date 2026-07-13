import { Inject, Injectable } from "@nestjs/common";
import type { CvVersion } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { CV_VERSION_REPOSITORY, type CvVersionRepository } from "../../domain/cv-version.repository";

@Injectable()
export class ListCvVersionsUseCase {
  constructor(
    @Inject(CV_VERSION_REPOSITORY) private readonly cvVersionRepository: CvVersionRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(ListCvVersionsUseCase.name);
  }

  async execute(usuarioId: string): Promise<CvVersion[]> {
    this.logger.debug(`Listing cv versions usuarioId=${usuarioId}`);
    const records = await this.cvVersionRepository.findAllByUser(usuarioId);

    const versions = await Promise.all(
      records.map(async (record) => ({
        ...record,
        rendimiento: await this.cvVersionRepository.computeRendimiento(record.id),
      })),
    );

    this.logger.log(`Listed ${versions.length} cv versions for usuarioId=${usuarioId}`);

    return versions;
  }
}
