import { describe, expect, it } from "vitest";
import { createFeedbackSchema, feedbackSchema } from "./feedback.schema.js";

const validFeedback = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  hitoId: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
  fechaEntrevista: "2024-04-18",
  tipoEntrevista: "Técnica",
  scoreTecnico: 6,
  scoreCultura: 8,
  comentarios: "Buen dominio de React, falta experiencia en Java/Spring.",
  habilidadesFaltantes: ["Java", "Spring Boot"],
};

describe("feedbackSchema", () => {
  it("parses a valid feedback unchanged", () => {
    expect(feedbackSchema.parse(validFeedback)).toEqual(validFeedback);
  });

  it("rejects a scoreTecnico above the 0-10 scale", () => {
    const result = feedbackSchema.safeParse({ ...validFeedback, scoreTecnico: 11 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("scoreTecnico");
    }
  });

  it("rejects a negative scoreCultura", () => {
    const result = feedbackSchema.safeParse({ ...validFeedback, scoreCultura: -1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("scoreCultura");
    }
  });

  it("rejects an empty comentarios", () => {
    const result = feedbackSchema.safeParse({ ...validFeedback, comentarios: "" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("comentarios");
    }
  });
});

describe("createFeedbackSchema", () => {
  it("omits id from the base schema", () => {
    const { id: _id, ...withoutId } = validFeedback;
    const result = createFeedbackSchema.safeParse(withoutId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
    }
  });
});
