import { describe, expect, it } from "vitest";
import { applicationSchema, createApplicationSchema, recruiterSchema } from "./application.schema.js";

const validApplication = {
  id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
  company: "Mercado Libre",
  role: "Senior Frontend Engineer",
  status: "Entrevista Técnica",
  cvVersion: "v2.1 — React + TypeScript",
  appliedDate: "2024-04-28",
  lastUpdated: "2024-05-04",
  techStack: ["React", "TypeScript"],
  timeline: [
    {
      id: "3f2504e0-4f89-41d3-9a0c-0305e82c3302",
      ramaId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
      date: "2024-04-28",
      status: "Enviado",
    },
  ],
};

describe("recruiterSchema", () => {
  it("parses a recruiter with only the required name", () => {
    expect(recruiterSchema.parse({ name: "Laura García" })).toEqual({ name: "Laura García" });
  });

  it("rejects an empty name", () => {
    expect(recruiterSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects an invalid recruiter email", () => {
    const result = recruiterSchema.safeParse({ name: "Laura García", email: "not-an-email" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("email");
    }
  });
});

describe("applicationSchema", () => {
  it("parses a valid application unchanged", () => {
    expect(applicationSchema.parse(validApplication)).toEqual(validApplication);
  });

  it("parses an application with recruiter and every optional field set", () => {
    const full = {
      ...validApplication,
      recruiter: { name: "Laura García", linkedin: "linkedin.com/in/lauragarcia", email: "l.garcia@meli.com" },
      notes: "Pasé el primer filtro de RRHH.",
      salary: "USD 4.000–5.500",
      location: "Buenos Aires (Híbrido)",
      source: "LinkedIn",
      archived: false,
    };

    expect(applicationSchema.parse(full)).toEqual(full);
  });

  it("rejects an invalid status", () => {
    const result = applicationSchema.safeParse({ ...validApplication, status: "En Pausa" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain("status");
    }
  });

  it("rejects an empty techStack entry array holding a non-string", () => {
    const result = applicationSchema.safeParse({ ...validApplication, techStack: [42] });

    expect(result.success).toBe(false);
  });

  it("rejects a timeline entry with an invalid hito", () => {
    const result = applicationSchema.safeParse({
      ...validApplication,
      timeline: [{ ...validApplication.timeline[0], status: "Invalido" }],
    });

    expect(result.success).toBe(false);
  });
});

describe("createApplicationSchema", () => {
  it("omits id, timeline, and lastUpdated from the base schema", () => {
    const { id: _id, timeline: _timeline, lastUpdated: _lastUpdated, ...rest } = validApplication;
    const result = createApplicationSchema.safeParse(rest);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("id");
      expect(result.data).not.toHaveProperty("timeline");
      expect(result.data).not.toHaveProperty("lastUpdated");
    }
  });
});
