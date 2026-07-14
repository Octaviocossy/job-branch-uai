export abstract class Persona {
  constructor(
    public readonly id: string,
    public readonly usuarioId: string,
    public readonly puestoCorporativo: string | null,
  ) {}

  abstract get tipo(): "recruiter" | "postulante";
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
