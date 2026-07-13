import { describe, expect, it } from "vitest";
import { createCvVersionSchema, cvVersionEstadoSchema, cvVersionSchema } from "./cv-version.schema.js";

const validCvVersion = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  name: "v1.0 — Fullstack General",
  focus: "General",
  tags: ["fullstack", "general"],
  esPerfilSalida: true,
  estado: "disponible",
  tamanioBytes: 204800,
  createdAt: "2024-01-10",
  rendimiento: { applications: 12, interviews: 3 },
};

describe("cvVersionEstadoSchema", () => {
  it("accepts every documented lifecycle state", () => {
    for (const estado of ["borrador", "disponible", "seleccionado_salida", "archivado"]) {
      expect(cvVersionEstadoSchema.safeParse(estado).success).toBe(true);
    }
  });

  it("rejects an unknown state", () => {
    expect(cvVersionEstadoSchema.safeParse("publicado").success).toBe(false);
  });
});

describe("cvVersionSchema", () => {
  it("parses a valid CV version unchanged", () => {
    expect(cvVersionSchema.parse(validCvVersion)).toEqual(validCvVersion);
  });

  it("rejects a zero or negative tamanioBytes", () => {
    const result = cvVersionSchema.safeParse({ ...validCvVersion, tamanioBytes: 0 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("tamanioBytes");
    }
  });

  it("rejects an invalid estado", () => {
    const result = cvVersionSchema.safeParse({ ...validCvVersion, estado: "publicado" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("estado");
    }
  });

  it("rejects a negative rendimiento.interviews", () => {
    const result = cvVersionSchema.safeParse({
      ...validCvVersion,
      rendimiento: { applications: 12, interviews: -1 },
    });

    expect(result.success).toBe(false);
  });
});

describe("createCvVersionSchema", () => {
  it("omits id, createdAt, and rendimiento from the base schema", () => {
    const { id: _id, createdAt: _createdAt, rendimiento: _rendimiento, ...rest } = validCvVersion;
    const result = createCvVersionSchema.safeParse(rest);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
      expect(result.data).not.toHaveProperty("createdAt");
      expect(result.data).not.toHaveProperty("rendimiento");
    }
  });
});
