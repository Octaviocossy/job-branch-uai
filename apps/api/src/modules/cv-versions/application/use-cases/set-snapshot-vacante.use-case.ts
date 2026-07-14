import { Inject, Injectable } from "@nestjs/common";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { CV_VERSION_REPOSITORY, type CvVersionRecord, type CvVersionRepository } from "../../domain/cv-version.repository";

@Injectable()
export class SetSnapshotVacanteUseCase {
  constructor(
    @Inject(CV_VERSION_REPOSITORY) private readonly cvVersionRepository: CvVersionRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SetSnapshotVacanteUseCase.name);
  }

  async execute(id: string, usuarioId: string, vacanteId: string): Promise<CvVersionRecord> {
    this.logger.debug(`Setting snapshot vacante cvVersionId=${id} vacanteId=${vacanteId}`);
    const updated = await this.cvVersionRepository.setSnapshotVacante(id, usuarioId, vacanteId);

    this.logger.log(`Snapshot vacante set id=${id}`);

    return updated;
  }
}
