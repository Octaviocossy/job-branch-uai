import { Inject, Injectable } from "@nestjs/common";
import type { CreatePersonaInput, Persona } from "@repo/models";
import { AppLogger } from "../../../../shared/logger/app.logger";
import { PERSONA_REPOSITORY, type PersonaRepository } from "../../domain/persona.repository";

@Injectable()
export class CreatePersonaUseCase {
  constructor(
    @Inject(PERSONA_REPOSITORY) private readonly personaRepository: PersonaRepository,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(CreatePersonaUseCase.name);
  }

  async execute(input: CreatePersonaInput): Promise<Persona> {
    this.logger.debug(`Creating persona tipo=${input.tipo} usuarioId=${input.usuarioId}`);
    const persona = await this.personaRepository.create(input);
    this.logger.log(`Persona created id=${persona.id}`);
    return persona;
  }
}
