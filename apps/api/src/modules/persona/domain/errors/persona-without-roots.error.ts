/** Raised when a Persona would be created holding no root (invariant 12). A caller bug, never client input, so it surfaces as a server error. */
export class PersonaWithoutRootsError extends Error {
  constructor() {
    super("A Persona holds at least one root");
    this.name = "PersonaWithoutRootsError";
  }
}
