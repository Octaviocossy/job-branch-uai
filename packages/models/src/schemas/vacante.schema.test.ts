import { describe, expect, it } from "vitest";
import { createVacanteSchema, vacanteSchema } from "./vacante.schema.js";

const validVacante = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  titulo: "Senior Frontend Engineer",
  descripcion: "Buscamos un desarrollador frontend senior con experiencia en React.",
  tecnologiasRequeridas: ["React", "TypeScript"],
  rangoSalarial: "USD 4.000–5.500",
  empresaId: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
};

describe("vacanteSchema", () => {
  it("parses a valid vacante unchanged", () => {
    expect(vacanteSchema.parse(validVacante)).toEqual(validVacante);
  });

  it("rejects an empty titulo", () => {
    const result = vacanteSchema.safeParse({ ...validVacante, titulo: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("titulo");
    }
  });

  it("rejects a non-UUID empresaId", () => {
    const result = vacanteSchema.safeParse({ ...validVacante, empresaId: "not-a-uuid" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("empresaId");
    }
  });

  it("rejects a non-array tecnologiasRequeridas", () => {
    const result = vacanteSchema.safeParse({ ...validVacante, tecnologiasRequeridas: "React" });

    expect(result.success).toBe(false);
  });
});

describe("createVacanteSchema", () => {
  it("omits id from the base schema", () => {
    const { id: _id, ...withoutId } = validVacante;
    const result = createVacanteSchema.safeParse(withoutId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
    }
  });
});
