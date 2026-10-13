import type { CreatePersonaInput, Persona } from "@repo/models";

export const PERSONA_REPOSITORY = Symbol("PERSONA_REPOSITORY");

export interface PersonaRepository {
  /**
   * Creates the Persona and hands it `raices` — ids of the permission components it holds as roots — in one
   * transaction, so a Persona never exists without roots (invariant 12). When the grant fails nothing is persisted.
   */
  create(input: CreatePersonaInput, raices: readonly string[]): Promise<Persona>;
  findByUsuarioId(usuarioId: string): Promise<Persona | null>;
}
