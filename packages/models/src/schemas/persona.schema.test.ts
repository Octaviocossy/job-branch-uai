import { describe, expect, it } from "vitest";
import { personaRecruiterSchema, personaSchema, personaTipoSchema, postulanteSchema } from "./persona.schema";

const validRecruiter = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  usuarioId: "5b1e2f1a-9c1a-4c3b-8f3a-2a1b3c4d5e6f",
  puestoCorporativo: "Talent Acquisition Lead",
  tipo: "recruiter",
  perNombre: "Ada",
  perApellido: "Lovelace",
  fechaContratacion: "2024-01-10",
};

const validPostulante = {
  id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  usuarioId: "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
  puestoCorporativo: null,
  tipo: "postulante",
  habilidadesMaster: ["typescript", "react"],
};

describe("personaTipoSchema", () => {
  it("accepts recruiter and postulante", () => {
    for (const tipo of ["recruiter", "postulante"]) {
      expect(personaTipoSchema.safeParse(tipo).success).toBe(true);
    }
  });

  it("rejects an unknown tipo", () => {
    expect(personaTipoSchema.safeParse("admin").success).toBe(false);
  });
});

describe("personaRecruiterSchema", () => {
  it("parses a valid recruiter", () => {
    expect(personaRecruiterSchema.parse(validRecruiter)).toEqual(validRecruiter);
  });

  it("rejects a recruiter missing fechaContratacion", () => {
    const { fechaContratacion: _fechaContratacion, ...rest } = validRecruiter;
    const result = personaRecruiterSchema.safeParse(rest);

    expect(result.success).toBe(false);
  });
});

describe("postulanteSchema", () => {
  it("parses a valid postulante", () => {
    expect(postulanteSchema.parse(validPostulante)).toEqual(validPostulante);
  });
});

describe("personaSchema", () => {
  it("parses a valid recruiter", () => {
    expect(personaSchema.parse(validRecruiter)).toEqual(validRecruiter);
  });

  it("parses a valid postulante", () => {
    expect(personaSchema.parse(validPostulante)).toEqual(validPostulante);
  });

  it("rejects an unknown tipo discriminant", () => {
    const result = personaSchema.safeParse({ ...validRecruiter, tipo: "admin" });

    expect(result.success).toBe(false);
  });
});
