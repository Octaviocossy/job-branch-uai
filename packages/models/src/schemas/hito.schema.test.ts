import { describe, expect, it } from "vitest";
import { applicationStatusSchema, createHitoSchema, hitoSchema, PIPELINE_STAGES } from "./hito.schema";

const validHito = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  ramaId: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
  date: "2024-04-28",
  status: "Enviado",
};

describe("applicationStatusSchema", () => {
  it("accepts every documented pipeline status", () => {
    for (const status of ["Enviado", "Entrevista Técnica", "RRHH", "Oferta", "Rechazado", "Archivado"]) {
      expect(applicationStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects an unknown status", () => {
    expect(applicationStatusSchema.safeParse("EnEspera").success).toBe(false);
  });
});

describe("PIPELINE_STAGES", () => {
  it("lists every status except the terminal Archivado stage", () => {
    expect(PIPELINE_STAGES).toEqual(["Enviado", "RRHH", "Entrevista Técnica", "Oferta", "Rechazado"]);
  });
});

describe("hitoSchema", () => {
  it("parses a minimal valid hito", () => {
    expect(hitoSchema.parse(validHito)).toEqual(validHito);
  });

  it("parses a hito with every optional field set", () => {
    const full = {
      ...validHito,
      note: "Llamada con RRHH",
      daysInStage: 4,
      tipo: "entrevista",
      fechaRecordatorioFollowUp: "2024-05-05",
      observaciones: "Sin respuesta aún",
    };

    expect(hitoSchema.parse(full)).toEqual(full);
  });

  it("rejects a non-UUID ramaId", () => {
    const result = hitoSchema.safeParse({ ...validHito, ramaId: "not-a-uuid" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("ramaId");
    }
  });

  it("rejects an invalid status", () => {
    const result = hitoSchema.safeParse({ ...validHito, status: "Pendiente" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("status");
    }
  });

  it("rejects a negative daysInStage", () => {
    const result = hitoSchema.safeParse({ ...validHito, daysInStage: -1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("daysInStage");
    }
  });
});

describe("createHitoSchema", () => {
  it("omits id from the base schema", () => {
    const { id: _id, ...withoutId } = validHito;
    const result = createHitoSchema.safeParse(withoutId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
    }
  });
});
