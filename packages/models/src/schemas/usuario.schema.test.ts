import { describe, expect, it } from "vitest";
import { usuarioSchema } from "./usuario.schema";

const validUsuario = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  email: "ada@example.com",
  nombreCompleto: "Ada Lovelace",
  authProvider: "native",
  intentosFallidos: 0,
};

describe("usuarioSchema", () => {
  it("parses a valid usuario unchanged", () => {
    expect(usuarioSchema.parse(validUsuario)).toEqual(validUsuario);
  });

  it("rejects a non-UUID id", () => {
    const result = usuarioSchema.safeParse({ ...validUsuario, id: "not-a-uuid" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("id");
    }
  });

  it("rejects an invalid email", () => {
    const result = usuarioSchema.safeParse({ ...validUsuario, email: "not-an-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("email");
    }
  });

  it("rejects an empty nombreCompleto", () => {
    const result = usuarioSchema.safeParse({ ...validUsuario, nombreCompleto: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("nombreCompleto");
    }
  });

  it("rejects a negative intentosFallidos", () => {
    const result = usuarioSchema.safeParse({ ...validUsuario, intentosFallidos: -1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("intentosFallidos");
    }
  });

  it("rejects a non-integer intentosFallidos", () => {
    const result = usuarioSchema.safeParse({ ...validUsuario, intentosFallidos: 1.5 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("intentosFallidos");
    }
  });
});
