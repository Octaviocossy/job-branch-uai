import { describe, expect, it } from "vitest";
import { createEmpresaSchema, empresaSchema } from "./empresa.schema.js";

const validEmpresa = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  nombre: "Mercado Libre",
  industria: "E-commerce",
};

describe("empresaSchema", () => {
  it("parses a minimal valid empresa", () => {
    expect(empresaSchema.parse(validEmpresa)).toEqual(validEmpresa);
  });

  it("parses an empresa with optional fields set", () => {
    const full = { ...validEmpresa, sitioWeb: "https://mercadolibre.com", reputacionTimeResponse: 3 };

    expect(empresaSchema.parse(full)).toEqual(full);
  });

  it("rejects an empty nombre", () => {
    const result = empresaSchema.safeParse({ ...validEmpresa, nombre: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("nombre");
    }
  });

  it("rejects an invalid sitioWeb URL", () => {
    const result = empresaSchema.safeParse({ ...validEmpresa, sitioWeb: "not-a-url" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("sitioWeb");
    }
  });

  it("rejects a negative reputacionTimeResponse", () => {
    const result = empresaSchema.safeParse({ ...validEmpresa, reputacionTimeResponse: -1 });

    expect(result.success).toBe(false);
  });
});

describe("createEmpresaSchema", () => {
  it("omits id from the base schema", () => {
    const { id: _id, ...withoutId } = validEmpresa;
    const result = createEmpresaSchema.safeParse(withoutId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
    }
  });
});
