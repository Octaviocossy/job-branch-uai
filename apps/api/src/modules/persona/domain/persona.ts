import type { PersonaTipo } from "@repo/models";

export abstract class Persona {
  constructor(
    public readonly id: string,
    public readonly usuarioId: string,
    public readonly puestoCorporativo: string | null,
  ) {}

  abstract get tipo(): PersonaTipo;
}

export class Recruiter extends Persona {
  constructor(
    id: string,
    usuarioId: string,
    puestoCorporativo: string | null,
    public readonly perNombre: string,
    public readonly perApellido: string,
    public readonly fechaContratacion: string,
  ) {
    super(id, usuarioId, puestoCorporativo);
  }

  get tipo(): "recruiter" {
    return "recruiter";
  }
}

export class Postulante extends Persona {
  constructor(
    id: string,
    usuarioId: string,
    puestoCorporativo: string | null,
    public readonly habilidadesMaster: string[],
  ) {
    super(id, usuarioId, puestoCorporativo);
  }

  get tipo(): "postulante" {
    return "postulante";
  }
}

/** SPEC 18.10 third Persona subtype; only the seed creates one (invariant 2). */
export class Administrador extends Persona {
  get tipo(): "administrador" {
    return "administrador";
  }
}
