import { describe, expect, it } from "vitest";
import { conversionSchema, profileRoiSchema, skillGapSchema, techHeatmapSchema, userStatsSchema } from "./metrics.schema.js";

describe("profileRoiSchema", () => {
  const valid = { cvVersionId: "3f2504e0-4f89-41d3-9a0c-0305e82c3301", applications: 12, interviews: 3, roi: 0.25 };

  it("parses a valid profile ROI entry", () => {
    expect(profileRoiSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a negative roi", () => {
    expect(profileRoiSchema.safeParse({ ...valid, roi: -0.1 }).success).toBe(false);
  });

  it("rejects a non-UUID cvVersionId", () => {
    expect(profileRoiSchema.safeParse({ ...valid, cvVersionId: "not-a-uuid" }).success).toBe(false);
  });
});

describe("conversionSchema", () => {
  const valid = { stage: "Entrevista Técnica", count: 5, conversionRate: 0.4 };

  it("parses a valid conversion entry", () => {
    expect(conversionSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an invalid stage", () => {
    expect(conversionSchema.safeParse({ ...valid, stage: "Desconocido" }).success).toBe(false);
  });

  it("rejects a conversionRate above 1", () => {
    expect(conversionSchema.safeParse({ ...valid, conversionRate: 1.5 }).success).toBe(false);
  });
});

describe("techHeatmapSchema", () => {
  const valid = { technology: "Java", applications: 8, rejections: 5, advances: 3 };

  it("parses a valid heatmap entry", () => {
    expect(techHeatmapSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an empty technology", () => {
    expect(techHeatmapSchema.safeParse({ ...valid, technology: "" }).success).toBe(false);
  });
});

describe("skillGapSchema", () => {
  const valid = { skill: "Java", missingCount: 4 };

  it("parses a valid skill gap entry", () => {
    expect(skillGapSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a negative missingCount", () => {
    expect(skillGapSchema.safeParse({ ...valid, missingCount: -1 }).success).toBe(false);
  });
});

describe("userStatsSchema", () => {
  const valid = { roiGlobal: 0.35, gapHabilidades: ["Java", "Kubernetes"] };

  it("parses valid user stats", () => {
    expect(userStatsSchema.parse(valid)).toEqual(valid);
  });

  it("rejects a negative roiGlobal", () => {
    expect(userStatsSchema.safeParse({ ...valid, roiGlobal: -0.1 }).success).toBe(false);
  });
});
