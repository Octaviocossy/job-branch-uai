import type { CreatePersonaInput, Persona } from "@repo/models";

export const PERSONA_REPOSITORY = Symbol("PERSONA_REPOSITORY");

export interface PersonaRepository {
  create(input: CreatePersonaInput): Promise<Persona>;
  findByUsuarioId(usuarioId: string): Promise<Persona | null>;
}
