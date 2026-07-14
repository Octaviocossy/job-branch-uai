import { Module } from "@nestjs/common";
import { CreatePersonaUseCase } from "./application/use-cases/create-persona.use-case";
import { PERSONA_REPOSITORY } from "./domain/persona.repository";
import { DrizzlePersonaRepository } from "./infrastructure/drizzle-persona.repository";

@Module({
  providers: [CreatePersonaUseCase, { provide: PERSONA_REPOSITORY, useClass: DrizzlePersonaRepository }],
  exports: [PERSONA_REPOSITORY, CreatePersonaUseCase],
})
export class PersonaModule {}
