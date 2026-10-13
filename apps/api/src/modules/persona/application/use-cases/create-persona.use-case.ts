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

  /** `raices` are the ids of the components the Persona holds as roots; it is created holding them, never without (invariant 12). */
  async execute(input: CreatePersonaInput, raices: readonly string[]): Promise<Persona> {
    if (raices.length === 0) {
      throw new Error("A Persona holds at least one root");
    }

    this.logger.debug(`Creating persona tipo=${input.tipo} usuarioId=${input.usuarioId}`);
    const persona = await this.personaRepository.create(input, raices);
    this.logger.log(`Persona created id=${persona.id}`);
    return persona;
  }
}
