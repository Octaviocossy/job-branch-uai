import type { PersonaTipo, Usuario as UsuarioModel } from "@repo/models";
import type { PasswordHasher } from "./password-hasher";

/** SPEC 19.13 `Usuario`. Holds `passwordHash` privately — it never leaves apps/api (invariant 3). */
export class Usuario {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly nombreCompleto: string,
    private readonly passwordHash: string | null,
    public readonly authProvider: string,
    private intentos: number,
    private readonly tipoPersona: PersonaTipo | null,
  ) {}

  get intentosFallidos(): number {
    return this.intentos;
  }

  async autenticar(password: string, hasher: PasswordHasher): Promise<boolean> {
    if (!this.passwordHash) {
      return false;
    }

    return hasher.compare(password, this.passwordHash);
  }

  incrementarIntentos(): void {
    this.intentos += 1;
  }

  /** SPEC 19.2 `obtenerRol()`: the role is the Persona's `tipo`; the Usuario stores none (invariant 2). */
  obtenerRol(): PersonaTipo | null {
    return this.tipoPersona;
  }

  toModel(): UsuarioModel {
    return {
      id: this.id,
      email: this.email,
      nombreCompleto: this.nombreCompleto,
      authProvider: this.authProvider,
      intentosFallidos: this.intentos,
    };
  }
}
